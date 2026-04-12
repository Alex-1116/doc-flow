import os
import logging
import uuid
from pathlib import Path
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
    SUPPORTED_FORMATS = {
        ".pdf": PyPDFLoader,
        ".txt": TextLoader,
        ".md": UnstructuredMarkdownLoader,
        ".markdown": UnstructuredMarkdownLoader,
        ".docx": Docx2txtLoader,
    }

    @classmethod
    def get_supported_formats(cls):
        return list(cls.SUPPORTED_FORMATS.keys())

    @classmethod
    def is_supported(cls, filename: str):
        ext = Path(filename).suffix.lower()
        return ext in cls.SUPPORTED_FORMATS

    @classmethod
    def parse(cls, file_path: str, original_filename: str = None):
        file_path = Path(file_path)
        ext = file_path.suffix.lower()

        if ext not in cls.SUPPORTED_FORMATS:
            raise ValueError(f"不支持的文件格式: {ext}")

        loader_class = cls.SUPPORTED_FORMATS[ext]
        
        try:
            loader = loader_class(str(file_path))
            documents = loader.load()
        except Exception as e:
            logger.error(f"Failed to load document {file_path}: {e}", exc_info=True)
            raise

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

        logger.info(f"Parsed document: {filename}, {len(documents)} sections")
        return documents, doc_id, metadata


def save_uploaded_file(file_content: bytes, filename: str) -> str:
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix
    save_path = upload_dir / f"{file_id}{ext}"

    try:
        with open(save_path, "wb") as f:
            f.write(file_content)
        logger.info(f"Saved uploaded file: {save_path}")
        return str(save_path)
    except Exception as e:
        logger.error(f"Failed to save file {filename}: {e}", exc_info=True)
        raise


def cleanup_file(file_path: str):
    if not file_path:
        return
    
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Cleaned up file: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to cleanup file {file_path}: {e}")
