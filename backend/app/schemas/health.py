from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    llm: dict
    embeddings: dict
    chromadb: dict
