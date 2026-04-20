from pydantic import BaseModel
from typing import Optional


class DocumentListItem(BaseModel):
    id: str
    name: str
    chunks: int


class DocumentDetailResponse(BaseModel):
    id: str
    name: str
    file_type: str
    chunks: int
    content: str

class QueryRequest(BaseModel):
    question: str
    k: int = 4
    session_id: Optional[str] = "default_session"

class HealthResponse(BaseModel):
    status: str
    llm: dict
    embeddings: dict
    chromadb: dict
