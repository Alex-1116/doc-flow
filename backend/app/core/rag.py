import logging
from typing import Optional, List, Dict, Any

from langchain_core.documents import Document

from app.core.vector_store import VectorStoreManager, ChromaUnavailableError
from app.services.document_service import DocumentService
from app.services.chat_service import ChatService
from app.services.chat_stream_service import ChatStreamService

logger = logging.getLogger(__name__)

# 为了兼容其他文件对 ChromaUnavailableError 的导入
__all__ = ["RAGEngine", "get_rag_engine", "ChromaUnavailableError"]

class RAGEngine:
    """RAG 引擎门面 (Facade)"""

    _instance: Optional['RAGEngine'] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return
            
        self.vector_store = VectorStoreManager()
        self.doc_service = DocumentService(self.vector_store)
        self.chat_service = ChatService(self.vector_store)
        self.chat_stream_service = ChatStreamService(self.vector_store)
        self._init_error: Optional[str] = None
        self._initialized = True

    def initialize(self, include_ai: bool = False) -> bool:
        """执行初始化。"""
        try:
            self.vector_store.get_client()
            if include_ai:
                self.vector_store.get_embeddings()
                self.vector_store.get_llm()
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
        return self._init_error is None

    @property
    def initialization_error(self) -> Optional[str]:
        """获取初始化错误信息"""
        return self._init_error

    def add_documents(self, documents: List[Document], metadatas: Optional[List[Dict]] = None) -> tuple:
        return self.doc_service.add_documents(documents, metadatas)

    def delete_document(self, doc_id: str) -> bool:
        return self.doc_service.delete_document(doc_id)

    def list_documents(self) -> List[Dict[str, Any]]:
        return self.doc_service.list_documents()

    def get_document_detail(self, doc_id: str) -> Optional[Dict[str, Any]]:
        return self.doc_service.get_document_detail(doc_id)

    def query(self, question: str, k: int = 4, session_id: str = "default_session") -> Dict[str, Any]:
        return self.chat_service.query(question, k, session_id)

    def stream_query(self, question: str, k: int = 4, session_id: str = "default_session"):
        return self.chat_stream_service.stream_query(question, k, session_id)

    def summarize(self, doc_id: str) -> str:
        return self.chat_service.summarize(doc_id)

    async def health_check(self, deep: bool = False) -> Dict[str, Any]:
        return await self.vector_store.health_check(deep)

# 延迟初始化单例
rag_engine: Optional[RAGEngine] = None

def get_rag_engine() -> RAGEngine:
    """获取 RAG 引擎实例（延迟初始化）"""
    global rag_engine
    if rag_engine is None:
        rag_engine = RAGEngine()
    return rag_engine
