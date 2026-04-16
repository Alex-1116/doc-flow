import os
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.core.config import settings
from app.core.rag import get_rag_engine
from app.api import api_router

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    logger.info("正在启动 DocFlow API...")

    # 创建上传目录
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # 初始化并发控制信号量并存入 app state
    app.state.upload_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_UPLOADS)
    logger.info(f"并发控制: 最大同时上传数 = {settings.MAX_CONCURRENT_UPLOADS}")

    # 延迟初始化 RAG 引擎
    rag = get_rag_engine()
    retry_count = 0
    max_retries = 2

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

# 注册 API 路由
app.include_router(api_router, prefix="/api")
