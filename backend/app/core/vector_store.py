import logging
from typing import Optional, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_community.vectorstores import Chroma

from app.core.config import settings
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

class VectorStoreManager:
    """负责 ChromaDB 的连接、初始化和健康检查"""
    
    def __init__(self):
        self._client: Optional[chromadb.HttpClient] = None
        self._embeddings: Optional[Any] = None
        self._llm: Optional[Any] = None

    @retry_with_backoff(max_retries=5, initial_delay=2.0)
    def _init_chroma_client(self) -> chromadb.HttpClient:
        logger.info(f"正在连接 ChromaDB: {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
        client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
            settings=ChromaSettings(
                allow_reset=True,
                anonymized_telemetry=False,
            )
        )
        client.heartbeat()
        logger.info("ChromaDB 连接成功")
        return client

    def get_client(self) -> chromadb.HttpClient:
        """获取 ChromaDB 客户端，如果未连接则尝试连接"""
        if self._client is None:
            self._client = self._init_chroma_client()
        return self._client

    def get_embeddings(self) -> Any:
        """获取 Embedding 实例"""
        if self._embeddings is None:
            self._embeddings = create_embeddings()
        return self._embeddings

    def get_llm(self) -> Any:
        """获取 LLM 实例"""
        if self._llm is None:
            self._llm = create_llm()
        return self._llm

    def get_collection(self):
        """获取或创建集合"""
        client = self.get_client()
        try:
            return client.get_collection(settings.CHROMA_COLLECTION)
        except Exception:
            logger.info(f"集合 {settings.CHROMA_COLLECTION} 不存在，正在创建...")
            return client.create_collection(
                name=settings.CHROMA_COLLECTION,
                metadata={"hnsw:space": "cosine"}
            )

    def get_vector_store(self) -> Chroma:
        """获取 LangChain 兼容的向量存储对象"""
        client = self.get_client()
        embeddings = self.get_embeddings()
        self.get_collection() # 确保集合存在
        
        return Chroma(
            client=client,
            collection_name=settings.CHROMA_COLLECTION,
            embedding_function=embeddings,
        )

    async def health_check(self, deep: bool = False) -> Dict[str, Any]:
        """执行健康检查"""
        status = {
            "status": "ok",
            "chromadb": {"connected": False, "error": None},
            "llm": {"checked": deep, "connected": None, "error": None},
            "embeddings": {"checked": deep, "connected": None, "error": None},
        }

        if deep:
            status["llm"] = await check_llm_health()
            status["llm"]["checked"] = True
            status["embeddings"] = await check_embeddings_health()
            status["embeddings"]["checked"] = True

        try:
            client = self.get_client()
            client.heartbeat()
            status["chromadb"]["connected"] = True
        except Exception as e:
            status["chromadb"]["error"] = str(e)
            status["status"] = "degraded"

        if deep and (
            not status["embeddings"]["connected"] or not status["llm"]["connected"]
        ):
            status["status"] = "degraded"

        return status
