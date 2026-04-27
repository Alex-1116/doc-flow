from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List, Optional

from app.db.models.chat import ChatSession, ChatMessage
from app.schemas.chat import ChatSessionCreate, ChatSessionUpdate, ChatMessageCreate

class CRUDChatSession:
    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[ChatSession]:
        stmt = select(ChatSession).order_by(ChatSession.updated_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get(self, db: AsyncSession, id: str) -> Optional[ChatSession]:
        stmt = select(ChatSession).where(ChatSession.id == id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, *, obj_in: ChatSessionCreate) -> ChatSession:
        db_obj = ChatSession(title=obj_in.title)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: ChatSession, obj_in: ChatSessionUpdate) -> ChatSession:
        if obj_in.title is not None:
            db_obj.title = obj_in.title
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, *, id: str) -> ChatSession:
        stmt = select(ChatSession).where(ChatSession.id == id)
        result = await db.execute(stmt)
        db_obj = result.scalar_one_or_none()
        if db_obj:
            await db.delete(db_obj)
            await db.commit()
        return db_obj


class CRUDChatMessage:
    async def get_multi_by_session(self, db: AsyncSession, *, session_id: str, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        stmt = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: ChatMessageCreate) -> ChatMessage:
        db_obj = ChatMessage(
            session_id=obj_in.session_id,
            role=obj_in.role,
            content=obj_in.content
        )
        db.add(db_obj)
        
        # 同时更新 session 的 updated_at
        stmt = select(ChatSession).where(ChatSession.id == obj_in.session_id)
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        if session:
            from app.utils.common import get_current_utc_time
            session.updated_at = get_current_utc_time()
            db.add(session)
            
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


chat_session = CRUDChatSession()
chat_message = CRUDChatMessage()
