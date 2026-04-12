import os
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx

from app.config import settings
from app.rag import get_rag_engine, RAGEngine
from app.parsers import DocumentParser, managed_temp_file

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# 并发控制信号量
upload_semaphore: Optional[asyncio.Semaphore] = None


async def check_service_health(url: str, timeout: float = 5.0) -> bool:
    """检查服务健康状态"""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            return response.status_code == 200
    except Exception:
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global upload_semaphore

    # 启动时执行
    logger.info("正在启动 DocFlow API...")

    # 创建上传目录
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # 初始化并发控制信号量
    upload_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_UPLOADS)
    logger.info(f"并发控制: 最大同时上传数 = {settings.MAX_CONCURRENT_UPLOADS}")

    # 延迟初始化 RAG 引擎
    rag = get_rag_engine()
    retry_count = 0
    max_retries = 10

    while retry_count < max_retries:
        if rag.initialize():
            logger.info("RAG 引擎初始化成功")
            break
        else:
            retry_count += 1
            logger.warning(f"RAG 引擎初始化失败，第 {retry_count} 次重试...")
            await asyncio.sleep(2)
    else:
        logger.error("RAG 引擎初始化失败，服务将以降级模式运行")

    yield

    # 关闭时执行
    logger.info("正在关闭 DocFlow API...")


app = FastAPI(
    title="DocFlow API",
    description="智能文档摘要与问答系统 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str
    k: int = 4


class HealthResponse(BaseModel):
    status: str
    ollama: dict
    chromadb: dict


def get_rag() -> RAGEngine:
    """依赖注入获取 RAG 引擎"""
    return get_rag_engine()


@app.get("/api/health", response_model=HealthResponse)
async def health_check(rag: RAGEngine = Depends(get_rag)):
    """健康检查端点 - 实际测试服务连接"""
    health = await rag.health_check()
    return HealthResponse(
        status=health["status"],
        ollama=health["ollama"],
        chromadb=health["chromadb"],
    )


@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    rag: RAGEngine = Depends(get_rag),
):
    """上传文档端点 - 带并发控制和资源管理"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="请选择文件")

    if not DocumentParser.is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。支持格式: {', '.join(DocumentParser.get_supported_formats())}",
        )

    # 使用信号量控制并发
    async with upload_semaphore:
        try:
            content = await file.read()

            if len(content) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"文件过大，最大支持 {settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
                )

            # 使用上下文管理器确保资源释放
            with managed_temp_file(content, file.filename) as temp_path:
                documents, doc_id, metadata = DocumentParser.parse(temp_path, file.filename)
                chunk_count, vector_ids = rag.add_documents(documents, [metadata])

            return JSONResponse(
                {
                    "doc_id": doc_id,
                    "filename": file.filename,
                    "chunks": chunk_count,
                    "status": "success",
                }
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"处理文件失败: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"处理文件失败: {str(e)}")


@app.post("/api/query")
async def query_documents(
    request: QueryRequest,
    rag: RAGEngine = Depends(get_rag),
):
    """查询文档端点"""
    try:
        # 使用 asyncio.wait_for 添加超时控制
        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None, lambda: rag.query(request.question, request.k)
            ),
            timeout=settings.REQUEST_TIMEOUT
        )
        return JSONResponse(result)
    except asyncio.TimeoutError:
        logger.error(f"查询超时: {request.question[:50]}...")
        raise HTTPException(status_code=504, detail="查询超时，请简化问题或稍后重试")
    except Exception as e:
        logger.error(f"查询失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str, rag: RAGEngine = Depends(get_rag)):
    """删除文档端点"""
    try:
        success = rag.delete_document(doc_id)
        if success:
            return JSONResponse({"status": "success", "doc_id": doc_id})
        else:
            raise HTTPException(status_code=500, detail="删除文档失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除文档失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除文档失败: {str(e)}")


@app.get("/api/documents")
async def list_documents(rag: RAGEngine = Depends(get_rag)):
    """列出所有文档"""
    try:
        # 获取向量存储并查询所有文档
        vector_store = rag.get_vector_store()
        # 这里可以通过元数据查询获取所有文档
        # 由于 ChromaDB 的限制，我们返回空列表
        return JSONResponse({"documents": []})
    except Exception as e:
        logger.error(f"列出文档失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"列出文档失败: {str(e)}")
