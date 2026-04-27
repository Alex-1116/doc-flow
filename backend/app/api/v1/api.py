from fastapi import APIRouter
from app.api.v1.endpoints import health, query, documents, user, auth, chat

api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(health.router, tags=["health"])
api_router.include_router(query.router, tags=["query"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

# 以下为示例/预留路由模块
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# api_router.include_router(user.router, prefix="/users", tags=["users"])
