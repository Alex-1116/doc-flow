import logging
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.models.schemas import QueryRequest
from app.core.config import settings
from app.core.rag import get_rag_engine, RAGEngine

logger = logging.getLogger(__name__)
router = APIRouter()

def get_rag() -> RAGEngine:
    return get_rag_engine()

@router.post("/query")
async def query_documents(
    request: QueryRequest,
    rag: RAGEngine = Depends(get_rag),
):
    """查询文档端点"""
    try:
        logger.info(f"开始查询: {request.question[:50]}...")
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None, lambda: rag.query(request.question, request.k, request.session_id)
            ),
            timeout=settings.REQUEST_TIMEOUT
        )
        logger.info("查询成功返回结果")
        return JSONResponse(result)
    except asyncio.TimeoutError:
        logger.error(f"查询超时: {request.question[:50]}...")
        raise HTTPException(status_code=504, detail="查询超时，请简化问题或稍后重试")
    except Exception as e:
        logger.error(f"查询失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
