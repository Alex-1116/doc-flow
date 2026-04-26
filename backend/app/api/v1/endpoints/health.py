from fastapi import APIRouter, Depends

from app.schemas.health import HealthResponse
from app.core.rag import get_rag_engine, RAGEngine

router = APIRouter()

def get_rag() -> RAGEngine:
    """依赖注入获取 RAG 引擎"""
    return get_rag_engine()

@router.get("/health", response_model=HealthResponse)
async def health_check(rag: RAGEngine = Depends(get_rag)):
    """轻量健康检查，不触发外部模型调用。"""
    health = await rag.health_check(deep=False)
    return HealthResponse(
        status=health["status"],
        llm=health["llm"],
        embeddings=health["embeddings"],
        chromadb=health["chromadb"],
    )


@router.get("/health/deep", response_model=HealthResponse)
async def deep_health_check(rag: RAGEngine = Depends(get_rag)):
    """深度健康检查，实际测试 LLM / Embedding / ChromaDB 连接。"""
    health = await rag.health_check(deep=True)
    return HealthResponse(
        status=health["status"],
        llm=health["llm"],
        embeddings=health["embeddings"],
        chromadb=health["chromadb"],
    )
