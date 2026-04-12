from fastapi import APIRouter
from app.api import health, query, documents

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(query.router, tags=["query"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
