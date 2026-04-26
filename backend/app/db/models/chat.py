from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.utils.common import get_current_utc_time, generate_uuid

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    title = Column(String, default="新对话")
    created_at = Column(DateTime, default=get_current_utc_time)
    updated_at = Column(DateTime, default=get_current_utc_time, onupdate=get_current_utc_time)
    
    # 一个会话对应多条消息
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    role = Column(String, nullable=False)  # "user", "ai", "system", etc.
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_current_utc_time)
    
    session = relationship("ChatSession", back_populates="messages")
