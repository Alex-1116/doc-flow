import os
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.core.config import settings
from app.core.logger import setup_logging, get_logger
from app.api.v1.api import api_router
from app.db.database import init_db
import app.db.models  # 确保所有 SQLAlchemy 模型在 init_db 之前被导入

# 统一配置全局日志（包括静音 Chroma 噪音等）
setup_logging()
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    logger.info("正在启动 DocFlow API...")

    # 初始化数据库
    await init_db()

    # 创建上传目录
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # 初始化并发控制信号量并存入 app state
    app.state.upload_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_UPLOADS)
    logger.info(f"并发控制: 最大同时上传数 = {settings.MAX_CONCURRENT_UPLOADS}")

    # 启动阶段不初始化 AI 客户端，避免热重载和非业务动作消耗模型额度。
    logger.info("服务以懒加载模式启动，模型将在实际业务请求时初始化")

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
app.include_router(api_router, prefix="/api/v1")