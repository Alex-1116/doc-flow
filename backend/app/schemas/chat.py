from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# ==========================
# Chat Message Schemas
# ==========================

class ChatMessageBase(BaseModel):
    role: str = Field(..., description="Role of the message sender (user, ai, system)")
    content: str = Field(..., description="Content of the message")

class ChatMessageCreate(ChatMessageBase):
    session_id: str

class ChatMessageResponse(ChatMessageBase):
    id: str
    session_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================
# Chat Session Schemas
# ==========================

class ChatSessionBase(BaseModel):
    title: str = Field(default="新对话", description="Title of the chat session")

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = Field(None, description="New title of the chat session")

class ChatSessionResponse(ChatSessionBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatSessionWithMessagesResponse(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []
