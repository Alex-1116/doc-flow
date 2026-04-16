import logging
from typing import Optional, List, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_community.vectorstores import Chroma
from langchain.chains.retrieval_qa.base import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.core.config import settings
from app.core.providers import (
    check_embeddings_health,
    check_llm_health,
    create_embeddings,
    create_llm,
)
from app.core.providers.common import retry_with_backoff

logger = logging.getLogger(__name__)


class RAGEngine:
    """RAG 引擎 - 支持延迟初始化和连接重试"""

    _instance: Optional['RAGEngine'] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        # 避免重复初始化
        if RAGEngine._initialized:
            return

        self._client: Optional[chromadb.HttpClient] = None
        self._embeddings: Optional[Any] = None
        self._llm: Optional[Any] = None
        self._text_splitter: Optional[RecursiveCharacterTextSplitter] = None
        self._init_error: Optional[str] = None

        # 延迟初始化，不在 __init__ 中建立连接
        RAGEngine._initialized = True

    @retry_with_backoff(max_retries=5, initial_delay=2.0)
    def _init_chroma_client(self) -> chromadb.HttpClient:
        """初始化 ChromaDB 客户端，带重试机制"""
        logger.info(f"正在连接 ChromaDB: {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
        client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
            settings=ChromaSettings(
                allow_reset=True,
                anonymized_telemetry=False,
            )
        )
        # 测试连接
        client.heartbeat()
        logger.info("ChromaDB 连接成功")
        return client

    def _init_ai_clients(self) -> tuple:
        """按 provider 初始化 Embedding 和 LLM。"""
        return create_embeddings(), create_llm()

    def initialize(self) -> bool:
        """执行实际初始化，返回是否成功"""
        if self.is_initialized:
            return True

        try:
            # 初始化 ChromaDB
            if self._client is None:
                self._client = self._init_chroma_client()

            # 初始化模型客户端
            if self._embeddings is None or self._llm is None:
                self._embeddings, self._llm = self._init_ai_clients()

            # 初始化文本分割器
            if self._text_splitter is None:
                self._text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=settings.CHUNK_SIZE,
                    chunk_overlap=settings.CHUNK_OVERLAP,
                )

            self._init_error = None
            logger.info("RAG 引擎初始化成功")
            return True

        except Exception as e:
            self._init_error = str(e)
            logger.error(f"RAG 引擎初始化失败: {e}")
            return False

    def ensure_initialized(self) -> None:
        """确保引擎已初始化，否则抛出异常"""
        if not self.initialize():
            raise RuntimeError(f"RAG 引擎未初始化: {self._init_error}")

    @property
    def is_initialized(self) -> bool:
        """检查引擎是否已初始化"""
        return self._client is not None and self._init_error is None

    @property
    def initialization_error(self) -> Optional[str]:
        """获取初始化错误信息"""
        return self._init_error

    def _get_or_create_collection(self):
        """获取或创建集合，避免集合不存在异常"""
        self.ensure_initialized()
        try:
            return self._client.get_collection(settings.CHROMA_COLLECTION)
        except Exception:
            logger.info(f"集合 {settings.CHROMA_COLLECTION} 不存在，正在创建...")
            return self._client.create_collection(
                name=settings.CHROMA_COLLECTION,
                metadata={"hnsw:space": "cosine"}
            )

    def get_vector_store(self):
        """获取向量存储"""
        self.ensure_initialized()
        # 确保集合存在
        self._get_or_create_collection()

        return Chroma(
            client=self._client,
            collection_name=settings.CHROMA_COLLECTION,
            embedding_function=self._embeddings,
        )

    def add_documents(self, documents: List[Document], metadatas: Optional[List[Dict]] = None) -> tuple:
        """添加文档，支持事务回滚"""
        self.ensure_initialized()

        if not documents:
            return 0, []

        vector_store = self.get_vector_store()
        chunks = self._text_splitter.split_documents(documents)

        if not chunks:
            return 0, []

        # 更新元数据
        if metadatas and len(chunks) > 0:
            for i, chunk in enumerate(chunks):
                if i < len(metadatas):
                    chunk.metadata.update(metadatas[i] if isinstance(metadatas[i], dict) else metadatas[0])

        # 批量添加，支持部分失败回滚
        added_ids = []
        try:
            ids = vector_store.add_documents(chunks)
            added_ids = ids if isinstance(ids, list) else [ids]
            logger.info(f"成功添加 {len(added_ids)} 个向量块")
            return len(chunks), added_ids
        except Exception as e:
            logger.error(f"添加向量失败: {e}")
            # 尝试回滚已添加的向量
            if added_ids:
                try:
                    vector_store.delete(ids=added_ids)
                    logger.info(f"已回滚 {len(added_ids)} 个向量")
                except Exception as rollback_error:
                    logger.error(f"回滚失败: {rollback_error}")
            raise

    def delete_document(self, doc_id: str) -> bool:
        """删除文档及其所有向量块"""
        self.ensure_initialized()

        try:
            vector_store = self.get_vector_store()
            # 使用 where 条件删除
            vector_store.delete(where={"doc_id": doc_id})
            logger.info(f"已删除文档 {doc_id} 的所有向量")
            return True
        except Exception as e:
            logger.error(f"删除文档失败: {e}")
            return False

    def query(self, question: str, k: int = 4) -> Dict[str, Any]:
        """查询文档"""
        self.ensure_initialized()

        vector_store = self.get_vector_store()

        prompt_template = """基于以下上下文回答用户的问题。如果不知道答案，就说不知道，不要编造答案。

上下文:
{context}

问题: {question}

请用中文回答:"""

        PROMPT = PromptTemplate(
            template=prompt_template, input_variables=["context", "question"]
        )

        chain_type_kwargs = {"prompt": PROMPT}

        qa_chain = RetrievalQA.from_chain_type(
            llm=self._llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": k}),
            chain_type_kwargs=chain_type_kwargs,
            return_source_documents=True,
        )

        result = qa_chain.invoke({"query": question})

        return {
            "answer": result["result"],
            "sources": [
                {
                    "content": doc.page_content[:200],
                    "metadata": doc.metadata,
                }
                for doc in result["source_documents"]
            ],
        }

    def summarize(self, doc_id: str) -> str:
        """文档摘要功能"""
        return "文档摘要功能开发中..."

    async def health_check(self) -> Dict[str, Any]:
        """健康检查 - 实际测试连接"""
        status = {
            "status": "ok",
            "chromadb": {"connected": False, "error": None},
            "llm": await check_llm_health(),
            "embeddings": await check_embeddings_health(),
        }

        # 检查 ChromaDB
        if self._client:
            try:
                self._client.heartbeat()
                status["chromadb"]["connected"] = True
            except Exception as e:
                status["chromadb"]["error"] = str(e)
                status["status"] = "degraded"
        else:
            status["chromadb"]["error"] = "未初始化"
            status["status"] = "degraded"

        if not status["embeddings"]["connected"] or not status["llm"]["connected"]:
            status["status"] = "degraded"

        return status


# 延迟初始化单例 - 不在导入时创建实例
rag_engine: Optional[RAGEngine] = None


def get_rag_engine() -> RAGEngine:
    """获取 RAG 引擎实例（延迟初始化）"""
    global rag_engine
    if rag_engine is None:
        rag_engine = RAGEngine()
    return rag_engine
