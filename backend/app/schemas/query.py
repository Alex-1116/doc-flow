from pydantic import BaseModel
from typing import Optional

class QueryRequest(BaseModel):
    question: str
    k: int = 4
    session_id: Optional[str] = "default_session"
