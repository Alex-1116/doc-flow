import os
import uuid
import logging
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from contextlib import contextmanager

from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
    Docx2txtLoader,
)

from .config import settings

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


@contextmanager
def managed_temp_file(file_content: bytes, filename: str):
    """
    上下文管理器 - 安全地管理临时文件

    确保即使在异常情况下也能清理临时文件
    """
    temp_path = None
    try:
        temp_path = save_uploaded_file(file_content, filename)
        yield temp_path
    finally:
        if temp_path:
            cleanup_file(temp_path)


def save_uploaded_file(file_content: bytes, filename: str) -> str:
    """
    保存上传的文件到临时目录

    Args:
        file_content: 文件内容
        filename: 文件名

    Returns:
        保存的文件路径
    """
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix
    save_path = upload_dir / f"{file_id}{ext}"

    try:
        with open(save_path, "wb") as f:
            f.write(file_content)
        logger.debug(f"文件已保存到 {save_path}")
        return str(save_path)
    except Exception as e:
        logger.error(f"保存文件失败: {e}")
        raise


def cleanup_file(file_path: str) -> bool:
    """
    清理临时文件

    Args:
        file_path: 文件路径

    Returns:
        是否成功删除
    """
    if not file_path:
        return True

    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            logger.debug(f"已删除临时文件: {file_path}")
        return True
    except PermissionError as e:
        logger.warning(f"没有权限删除文件 {file_path}: {e}")
        return False
    except FileNotFoundError:
        # 文件不存在，视为成功
        return True
    except Exception as e:
        logger.error(f"删除文件 {file_path} 失败: {e}")
        return False
