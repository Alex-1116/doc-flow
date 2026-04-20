import logging
from typing import Optional, List, Dict, Any

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.core.config import settings
from app.core.vector_store import VectorStoreManager, ChromaUnavailableError

logger = logging.getLogger(__name__)

class DocumentService:
    """负责处理文档的增删改查业务逻辑"""
    
    def __init__(self, vector_store_manager: VectorStoreManager):
        self.vsm = vector_store_manager
        self._text_splitter: Optional[RecursiveCharacterTextSplitter] = None

    def _get_text_splitter(self) -> RecursiveCharacterTextSplitter:
        """懒加载文本切分器"""
        if self._text_splitter is None:
            self._text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            )
        return self._text_splitter

    def add_documents(self, documents: List[Document], metadatas: Optional[List[Dict]] = None) -> tuple:
        """切分并添加文档向量"""
        if not documents:
            return 0, []

        splitter = self._get_text_splitter()
        chunks = splitter.split_documents(documents)

        if not chunks:
            return 0, []

        # 更新元数据
        if metadatas and len(chunks) > 0:
            for i, chunk in enumerate(chunks):
                if i < len(metadatas):
                    chunk.metadata.update(metadatas[i] if isinstance(metadatas[i], dict) else metadatas[0])

        vector_store = self.vsm.get_vector_store()
        added_ids = []
        try:
            ids = vector_store.add_documents(chunks)
            added_ids = ids if isinstance(ids, list) else [ids]
            logger.info(f"成功添加 {len(added_ids)} 个向量块")
            return len(chunks), added_ids
        except Exception as e:
            logger.error(f"添加向量失败: {e}")
            if added_ids:
                try:
                    vector_store.delete(ids=added_ids)
                    logger.info(f"已回滚 {len(added_ids)} 个向量")
                except Exception as rollback_error:
                    logger.error(f"回滚失败: {rollback_error}")
            raise

    def delete_document(self, doc_id: str) -> bool:
        """删除特定文档的全部数据"""
        try:
            client = self.vsm.get_client()
            collection = client.get_collection(settings.CHROMA_COLLECTION)
            collection.delete(where={"doc_id": doc_id})
            logger.info(f"已删除文档 {doc_id} 的所有向量")
            return True
        except Exception as e:
            logger.error(f"删除文档失败: {e}")
            return False

    def list_documents(self) -> List[Dict[str, Any]]:
        """获取已存储的文档列表"""
        try:
            client = self.vsm.get_client()
        except Exception as e:
            logger.error(f"无法连接 ChromaDB: {e}", exc_info=True)
            raise ChromaUnavailableError(str(e)) from e

        try:
            collection = client.get_collection(settings.CHROMA_COLLECTION)
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
        """获取文档的详细内容(聚合所有的 Chunk)"""
        try:
            client = self.vsm.get_client()
        except Exception as e:
            logger.error(f"无法连接 ChromaDB: {e}", exc_info=True)
            raise ChromaUnavailableError(str(e)) from e

        try:
            collection = client.get_collection(settings.CHROMA_COLLECTION)
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
