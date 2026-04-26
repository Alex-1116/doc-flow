import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

# SQLite 数据库文件路径
if settings.DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    DB_DIR = os.path.join(BASE_DIR, settings.DB_DIR)
    os.makedirs(DB_DIR, exist_ok=True)
    SQLALCHEMY_DATABASE_URL = f"sqlite+aiosqlite:///{DB_DIR}/docflow.db"

# 创建异步引擎
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,  # 设置为 True 可以打印生成的 SQL 语句，方便开发调试
    connect_args={"check_same_thread": False}  # SQLite 需要此配置以支持多线程访问
)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# 声明基类，所有 ORM 模型都将继承它
Base = declarative_base()

async def init_db():
    """初始化数据库，创建所有表"""
    try:
        async with engine.begin() as conn:
            # 自动创建所有继承了 Base 的表
            await conn.run_sync(Base.metadata.create_all)
            logger.info("数据库表创建成功或已存在")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}", exc_info=True)
