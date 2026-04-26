import os
from pydantic_settings import BaseSettings


def env_or_default(name: str, default: str = "") -> str:
    """把空字符串也视为未配置，避免被 compose 注入的空值覆盖回退逻辑。"""
    value = os.getenv(name)
    if value is None:
        return default
    value = value.strip()
    return value if value else default


class Settings(BaseSettings):
    # Provider 配置
    LLM_PROVIDER: str = env_or_default("LLM_PROVIDER", "openai_compatible")
    EMBEDDING_PROVIDER: str = env_or_default("EMBEDDING_PROVIDER", "openai_compatible")

    # OpenAI 兼容接口配置
    LLM_BASE_URL: str = env_or_default("LLM_BASE_URL", "")
    LLM_API_KEY: str = env_or_default("LLM_API_KEY", "")
    LLM_MODEL: str = env_or_default("LLM_MODEL", "gpt-4o-mini")

    EMBEDDING_BASE_URL: str = env_or_default("EMBEDDING_BASE_URL", env_or_default("LLM_BASE_URL", ""))
    EMBEDDING_API_KEY: str = env_or_default("EMBEDDING_API_KEY", env_or_default("LLM_API_KEY", ""))
    EMBEDDING_MODEL: str = env_or_default("EMBEDDING_MODEL", "text-embedding-3-small")
    GEMINI_EMBEDDING_PATH: str = env_or_default("GEMINI_EMBEDDING_PATH", "")

    # ChromaDB 配置
    CHROMA_HOST: str = env_or_default("CHROMA_HOST", "localhost")
    CHROMA_PORT: int = int(env_or_default("CHROMA_PORT", "8000"))
    CHROMA_COLLECTION: str = env_or_default("CHROMA_COLLECTION", "docflow_documents")

    # 文档处理配置
    CHUNK_SIZE: int = int(env_or_default("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP: int = int(env_or_default("CHUNK_OVERLAP", "200"))
    UPLOAD_DIR: str = env_or_default("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE: int = int(env_or_default("MAX_FILE_SIZE", str(50 * 1024 * 1024)))  # 50MB

    # 并发控制配置
    MAX_CONCURRENT_UPLOADS: int = int(env_or_default("MAX_CONCURRENT_UPLOADS", "3"))
    REQUEST_TIMEOUT: int = int(env_or_default("REQUEST_TIMEOUT", "300"))  # 5分钟

    # JWT 与 安全配置
    SECRET_KEY: str = env_or_default("SECRET_KEY", "your-super-secret-key-please-change-in-production")
    ALGORITHM: str = env_or_default("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(env_or_default("ACCESS_TOKEN_EXPIRE_MINUTES", str(30 * 24 * 60)))  # 默认 30 天

    # 关系型数据库配置
    DB_DIR: str = env_or_default("DB_DIR", "data")
    DATABASE_URL: str = env_or_default("DATABASE_URL", "") # 如果为空，则由 database.py 自行拼接 SQLite 路径

    class Config:
        env_file = ".env"


settings = Settings()
