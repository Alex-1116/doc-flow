from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.crud import chat as crud_chat
from app.schemas.chat import (
    ChatSessionCreate, 
    ChatSessionUpdate, 
    ChatSessionResponse, 
    ChatMessageCreate, 
    ChatMessageResponse
)

router = APIRouter()

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def read_sessions(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取所有的聊天会话列表
    """
    sessions = await crud_chat.chat_session.get_multi(db, skip=skip, limit=limit)
    return sessions

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    *,
    db: AsyncSession = Depends(deps.get_db),
    session_in: ChatSessionCreate,
) -> Any:
    """
    创建一个新的聊天会话
    """
    session = await crud_chat.chat_session.create(db, obj_in=session_in)
    return session

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def read_session(
    session_id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    通过 ID 获取单个会话的信息
    """
    session = await crud_chat.chat_session.get(db, id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/sessions/{session_id}", response_model=ChatSessionResponse)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    删除指定的会话及其所有消息
    """
    session = await crud_chat.chat_session.get(db, id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session = await crud_chat.chat_session.remove(db, id=session_id)
    return session

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def read_session_messages(
    session_id: str,
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 500,
) -> Any:
    """
    获取指定会话下的所有消息
    """
    # 确认会话存在
    session = await crud_chat.chat_session.get(db, id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = await crud_chat.chat_message.get_multi_by_session(
        db, session_id=session_id, skip=skip, limit=limit
    )
    return messages

@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def create_message(
    session_id: str,
    message_in: ChatMessageCreate,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    给指定的会话添加一条新消息 (这通常在流式输出结束后由后端直接调用，或者供前端同步消息使用)
    """
    if message_in.session_id != session_id:
        raise HTTPException(status_code=400, detail="session_id mismatch")
        
    session = await crud_chat.chat_session.get(db, id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    message = await crud_chat.chat_message.create(db, obj_in=message_in)
    return message
