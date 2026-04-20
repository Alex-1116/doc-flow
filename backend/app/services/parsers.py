import os
import uuid
import logging
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
    Docx2txtLoader,
)

logger = logging.getLogger(__name__)


class DocumentParser:
    """文档解析器 - 支持多种格式"""

    SUPPORTED_FORMATS = {
        ".pdf": PyPDFLoader,
        ".txt": TextLoader,
        ".md": UnstructuredMarkdownLoader,
        ".markdown": UnstructuredMarkdownLoader,
        ".docx": Docx2txtLoader,
    }

    @classmethod
    def get_supported_formats(cls) -> List[str]:
        """获取支持的文件格式列表"""
        return list(cls.SUPPORTED_FORMATS.keys())

    @classmethod
    def is_supported(cls, filename: str) -> bool:
        """检查文件格式是否支持"""
        ext = Path(filename).suffix.lower()
        return ext in cls.SUPPORTED_FORMATS

    @classmethod
    def parse(
        cls, file_path: str, original_filename: str = None
    ) -> Tuple[List[Document], str, Dict[str, Any]]:
        """
        解析文档

        Args:
            file_path: 文件路径
            original_filename: 原始文件名

        Returns:
            Tuple of (documents, doc_id, metadata)

        Raises:
            ValueError: 不支持的文件格式
            Exception: 解析失败
        """
        file_path = Path(file_path)
        ext = file_path.suffix.lower()

        if ext not in cls.SUPPORTED_FORMATS:
            raise ValueError(f"不支持的文件格式: {ext}")

        loader_class = cls.SUPPORTED_FORMATS[ext]
        loader = loader_class(str(file_path))

        try:
            documents = loader.load()
        except Exception as e:
            logger.error(f"解析文件 {file_path} 失败: {e}")
            raise Exception(f"解析文件失败: {str(e)}")

        doc_id = str(uuid.uuid4())
        filename = original_filename or file_path.name

        metadata = {
            "doc_id": doc_id,
            "filename": filename,
            "file_type": ext,
            "source": str(file_path),
        }

        for doc in documents:
            doc.metadata.update(metadata)

        logger.info(f"成功解析文件 {filename}, 生成 {len(documents)} 个文档块")
        return documents, doc_id, metadata
