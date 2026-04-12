import logging
import os
import uuid
from pathlib import Path

from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
)

from .config import settings

logger = logging.getLogger(__name__)


class MarkdownFallbackLoader:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self) -> list[Document]:
        with open(self.file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return [Document(page_content=content, metadata={"source": self.file_path})]


def get_markdown_loader():
    try:
        from langchain_community.document_loaders import UnstructuredMarkdownLoader
        return UnstructuredMarkdownLoader
    except ImportError as e:
        logger.warning(f"UnstructuredMarkdownLoader not available, using fallback: {e}")
        return MarkdownFallbackLoader


class DocumentParser:
    UnstructuredMarkdownLoader = get_markdown_loader()

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
            logger.warning(f"Primary loader failed for {ext}, trying TextLoader fallback: {e}")
            loader = TextLoader(str(file_path), autodetect_encoding=True)
            documents = loader.load()

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

        logger.info(f"Parsed {filename}: {len(documents)} documents")
        return documents, doc_id, metadata


def save_uploaded_file(file_content: bytes, filename: str) -> str:
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix
    save_path = upload_dir / f"{file_id}{ext}"

    with open(save_path, "wb") as f:
        f.write(file_content)

    logger.debug(f"Saved uploaded file: {save_path}")
    return str(save_path)


def cleanup_file(file_path: str):
    try:
        os.remove(file_path)
        logger.debug(f"Cleaned up file: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to cleanup file {file_path}: {e}")
