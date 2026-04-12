import os
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
        loader = loader_class(str(file_path))
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

        return documents, doc_id, metadata


def save_uploaded_file(file_content: bytes, filename: str) -> str:
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix
    save_path = upload_dir / f"{file_id}{ext}"

    with open(save_path, "wb") as f:
        f.write(file_content)

    return str(save_path)


def cleanup_file(file_path: str):
    try:
        os.remove(file_path)
    except Exception:
        pass
