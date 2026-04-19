from pydantic import BaseModel


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

class HealthResponse(BaseModel):
    status: str
    llm: dict
    embeddings: dict
    chromadb: dict
