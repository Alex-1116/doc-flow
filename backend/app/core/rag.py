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
from app.core.agent import build_rag_agent_graph
from app.core.providers import (
    check_embeddings_health,
    check_llm_health,
    create_embeddings,
    create_llm,
)
from app.core.providers.common import retry_with_backoff

logger = logging.getLogger(__name__)

class ChromaUnavailableError(RuntimeError):
    """ChromaDB 不可用。"""


class RAGEngine:
    """RAG 引擎 - 支持延迟初始化和连接重试。"""


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

    def _ensure_chroma_client(self) -> None:
        """确保 ChromaDB 已连接。"""
        if self._client is None:
            self._client = self._init_chroma_client()

    def _ensure_text_splitter(self) -> None:
        """确保文本切分器可用。"""
        if self._text_splitter is None:
            self._text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            )

    def _ensure_embeddings(self) -> None:
        """按需初始化 Embedding 客户端。"""
        # 上传和检索依赖向量化能力，但不一定需要 LLM。
        if self._embeddings is None:
            self._embeddings = create_embeddings()

    def _ensure_llm(self) -> None:
        """按需初始化 LLM 客户端。"""
        # 只有问答这类生成场景才拉起 LLM，避免启动/热重载时产生外部调用。
        if self._llm is None:
            self._llm = create_llm()

    def initialize(self, include_ai: bool = False) -> bool:
        """执行初始化。

        默认只初始化本地依赖，避免在启动/热重载阶段调用外部模型。
        include_ai=True 时才初始化 Embedding 和 LLM。
        """
        if self.is_initialized:
            return True

        try:
            self._ensure_chroma_client()
            self._ensure_text_splitter()
            if include_ai:
                self._ensure_embeddings()
                self._ensure_llm()

            self._init_error = None
            logger.info("RAG 引擎初始化成功")
            return True

        except Exception as e:
            self._init_error = str(e)
            logger.error(f"RAG 引擎初始化失败: {e}")
            return False

    def ensure_initialized(self) -> None:
        """确保引擎已初始化，否则抛出异常"""
        if not self.initialize(include_ai=False):
            raise RuntimeError(f"RAG 引擎未初始化: {self._init_error}")

    @property
    def is_initialized(self) -> bool:
        """检查引擎是否已初始化"""
        return self._client is not None and self._text_splitter is not None and self._init_error is None

    @property
    def initialization_error(self) -> Optional[str]:
        """获取初始化错误信息"""
        return self._init_error

    def _get_or_create_collection(self):
        """获取或创建集合，避免集合不存在异常"""
        self._ensure_chroma_client()
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
        self._ensure_chroma_client()
        self._ensure_embeddings()
        # 向量存储只依赖 Chroma 和 Embedding，不依赖 LLM。
        self._get_or_create_collection()

        return Chroma(
            client=self._client,
            collection_name=settings.CHROMA_COLLECTION,
            embedding_function=self._embeddings,
        )

    def add_documents(self, documents: List[Document], metadatas: Optional[List[Dict]] = None) -> tuple:
        """添加文档，支持事务回滚"""
        # 上传阶段只做切片和向量化，因此不主动初始化 LLM。
        self._ensure_chroma_client()
        self._ensure_text_splitter()
        self._ensure_embeddings()

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
        # 尝试只初始化 ChromaDB 客户端，不强制要求所有 AI 客户端都成功
        if self._client is None:
            try:
                self._client = self._init_chroma_client()
            except Exception as e:
                logger.error(f"无法连接 ChromaDB: {e}")
                return False

        try:
            collection = self._client.get_collection(settings.CHROMA_COLLECTION)
            collection.delete(where={"doc_id": doc_id})
            logger.info(f"已删除文档 {doc_id} 的所有向量")
            return True
        except Exception as e:
            logger.error(f"删除文档失败: {e}")
            return False

    def list_documents(self) -> List[Dict[str, Any]]:
        """列出所有文档。

        ChromaDB 连接失败时抛出 ChromaUnavailableError；
        集合不存在时返回空列表。
        """
        # 列表页属于只读存储能力，不应因为模型不可用而失败。
        try:
            self._ensure_chroma_client()
        except Exception as e:
            logger.error(f"无法连接 ChromaDB: {e}", exc_info=True)
            raise ChromaUnavailableError(str(e)) from e

        try:
            collection = self._client.get_collection(settings.CHROMA_COLLECTION)
            results = collection.get(include=["metadatas"])
        except Exception as e:
            message = str(e).lower()
            if "does not exist" in message or "not found" in message:
                return []
            logger.error(f"读取文档列表失败: {e}", exc_info=True)
            raise ChromaUnavailableError(str(e)) from e

        docs_map: Dict[str, Dict[str, Any]] = {}
        for meta in (results.get("metadatas") or []):
            if not meta:
                continue
            doc_id = meta.get("doc_id")
            if doc_id and doc_id not in docs_map:
                docs_map[doc_id] = {
                    "id": doc_id,
                    "name": meta.get("filename", "未知文档"),
                    "chunks": 0,
                }
            if doc_id:
                docs_map[doc_id]["chunks"] += 1

        return list(docs_map.values())

    def get_document_detail(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """获取文档详情及可阅读正文"""
        # 详情预览只需要从 Chroma 聚合原始分块，不需要 Embedding / LLM。
        try:
            self._ensure_chroma_client()
        except Exception as e:
            logger.error(f"无法连接 ChromaDB: {e}", exc_info=True)
            raise ChromaUnavailableError(str(e)) from e

        try:
            collection = self._client.get_collection(settings.CHROMA_COLLECTION)
            results = collection.get(
                where={"doc_id": doc_id},
                include=["documents", "metadatas"],
            )
        except Exception as e:
            logger.error(f"获取文档详情失败: {e}", exc_info=True)
            raise ChromaUnavailableError(str(e)) from e

        documents = results.get("documents") or []
        metadatas = results.get("metadatas") or []

        if not documents:
            return None

        # 尽可能按页码恢复文档顺序；没有页码时沿用存储返回顺序。
        ordered_chunks = sorted(
            zip(documents, metadatas),
            key=lambda item: (
                item[1].get("page", 0) if isinstance(item[1], dict) else 0,
            ),
        )

        first_meta = metadatas[0] if metadatas and isinstance(metadatas[0], dict) else {}
        content = "\n\n".join(
            chunk.strip() for chunk, _meta in ordered_chunks if isinstance(chunk, str) and chunk.strip()
        )

        return {
            "id": doc_id,
            "name": first_meta.get("filename", "未知文档"),
            "file_type": first_meta.get("file_type", ""),
            "chunks": len(documents),
            "content": content,
        }

    def query(self, question: str, k: int = 4) -> Dict[str, Any]:
        """基于 LangGraph 架构查询文档"""
        # 问答同时依赖检索和生成，因此这里才会拉起 Embedding + LLM。
        self._ensure_chroma_client()
        self._ensure_text_splitter()
        self._ensure_embeddings()
        self._ensure_llm()

        vector_store = self.get_vector_store()
        retriever = vector_store.as_retriever(search_kwargs={"k": k})

        # 获取编译好的 LangGraph 执行图
        app = build_rag_agent_graph(llm=self._llm, retriever=retriever)

        from langchain_core.messages import HumanMessage
        # 执行 Graph
        inputs = {
            "documents": [], 
            "k": k, 
            "iterations": 0,
            "messages": [HumanMessage(content=question)]
        }
        result = app.invoke(inputs)

        # 在标准 Tool Calling 架构中，最终回答存储在 messages 列表的最后一个元素中
        final_answer = ""
        if result.get("messages"):
            final_answer = result["messages"][-1].content

        return {
            "answer": final_answer,
            "sources": [
                {
                    "content": doc.page_content[:200],
                    "metadata": doc.metadata,
                }
                for doc in result.get("documents", [])
            ]
        }

    def summarize(self, doc_id: str) -> str:
        """文档摘要功能"""
        return "文档摘要功能开发中..."

    async def health_check(self, deep: bool = False) -> Dict[str, Any]:
        """健康检查。

        deep=False: 仅检查服务和 ChromaDB，不调用外部模型。
        deep=True: 额外检查 LLM / Embedding 连通性。
        """
        status = {
            "status": "ok",
            "chromadb": {"connected": False, "error": None},
            "llm": {"checked": deep, "connected": None, "error": None},
            "embeddings": {"checked": deep, "connected": None, "error": None},
        }

        if deep:
            # deep health 仅用于人工排查，默认健康检查不会走到这里。
            status["llm"] = await check_llm_health()
            status["llm"]["checked"] = True
            status["embeddings"] = await check_embeddings_health()
            status["embeddings"]["checked"] = True

        # 检查 ChromaDB
        try:
            self._ensure_chroma_client()
        except Exception as e:
            status["chromadb"]["error"] = str(e)
            status["status"] = "degraded"
            return status

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

        if deep and (
            not status["embeddings"]["connected"] or not status["llm"]["connected"]
        ):
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
