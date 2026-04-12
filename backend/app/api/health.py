from fastapi import APIRouter, Depends

from app.models.schemas import HealthResponse
from app.core.rag import get_rag_engine, RAGEngine

router = APIRouter()

def get_rag() -> RAGEngine:
    """依赖注入获取 RAG 引擎"""
    return get_rag_engine()

@router.get("/health", response_model=HealthResponse)
async def health_check(rag: RAGEngine = Depends(get_rag)):
    """健康检查端点 - 实际测试服务连接"""
    health = await rag.health_check()
    return HealthResponse(
        status=health["status"],
        ollama=health["ollama"],
        chromadb=health["chromadb"],
    )
