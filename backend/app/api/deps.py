# 依赖注入 (Dependencies) 文件
# 这里通常存放各种可以在 FastAPI 路由中复用的依赖项
# 例如：获取数据库连接 Session 的依赖 (get_db)、解析当前用户的依赖 (get_current_user) 等

from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import AsyncSessionLocal

# 获取数据库会话的依赖函数
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    提供数据库的异步 Session。
    FastAPI 路由退出时，会自动调用 await session.close() 进行清理。
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
