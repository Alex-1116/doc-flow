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
