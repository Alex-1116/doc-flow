from pydantic import BaseModel

class QueryRequest(BaseModel):
    question: str
    k: int = 4

class HealthResponse(BaseModel):
    status: str
    llm: dict
    embeddings: dict
    chromadb: dict
