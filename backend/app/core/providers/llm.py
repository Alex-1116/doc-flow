import logging
from typing import Any, Dict

import httpx
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.core.providers.common import build_api_url, retry_with_backoff


logger = logging.getLogger(__name__)


@retry_with_backoff(max_retries=5, initial_delay=2.0)
def init_openai_compatible_llm():
    """初始化 OpenAI 兼容 LLM 客户端。

    这里只构造客户端，不在启动或热重载阶段发起真实模型调用。
    """
    if not settings.LLM_API_KEY:
        raise ValueError("缺少 LLM_API_KEY，请在环境变量中配置")
    if not settings.LLM_MODEL:
        raise ValueError("缺少 LLM_MODEL，请在环境变量中配置")

    logger.info(f"正在连接 LLM 服务: {settings.LLM_BASE_URL}")
    llm = ChatOpenAI(
        model=settings.LLM_MODEL,
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        temperature=0,
        timeout=settings.REQUEST_TIMEOUT,
        max_retries=5,  # 最大重试次数
        default_headers={"Connection": "close"},  # 关闭连接，避免连接池问题
        streaming=True,  # 必须开启流式，否则当前模型在长上下文时会返回空字符串
    )
    logger.info(f"LLM 客户端 {settings.LLM_MODEL} 初始化完成")
    return llm


def create_llm() -> Any:
    """按配置返回 LLM 客户端。"""
    if settings.LLM_PROVIDER == "openai_compatible":
        return init_openai_compatible_llm()
    raise ValueError(f"不支持的 LLM_PROVIDER: {settings.LLM_PROVIDER}")


async def check_llm_health() -> Dict[str, Any]:
    """检查 LLM provider 健康状态。"""
    status: Dict[str, Any] = {
        "provider": settings.LLM_PROVIDER,
        "connected": False,
        "error": None,
        "model": settings.LLM_MODEL,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if settings.LLM_PROVIDER == "openai_compatible":
                response = await client.post(
                    build_api_url(settings.LLM_BASE_URL, "/chat/completions"),
                    headers={
                        "Authorization": f"Bearer {settings.LLM_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.LLM_MODEL,
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_completion_tokens": 1,
                    },
                )
            else:
                raise ValueError(f"不支持的 LLM_PROVIDER: {settings.LLM_PROVIDER}")

            response.raise_for_status()
            status["connected"] = True
    except Exception as exc:
        status["error"] = str(exc)

    return status
