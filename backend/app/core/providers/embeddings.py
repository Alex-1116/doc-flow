import logging
from typing import Any, Dict, List, Tuple

import httpx
from langchain_openai import OpenAIEmbeddings

from app.core.config import settings
from app.core.providers.common import build_api_url, retry_with_backoff


logger = logging.getLogger(__name__)


def normalize_gemini_base_url(base_url: str) -> str:
    """Gemini 转发路径通常不挂在 /v1 下，这里做归一化。"""
    normalized = base_url.rstrip("/")
    if normalized.endswith("/v1"):
        normalized = normalized[:-3]
    return normalized.rstrip("/")


def build_gemini_requests(base_url: str, model: str, text: str, endpoint_path: str = "") -> List[Tuple[str, Dict[str, Any]]]:
    """构造 Gemini Embedding 的候选请求。"""
    normalized_base_url = normalize_gemini_base_url(base_url)
    model_name = model.removeprefix("models/")

    if endpoint_path:
        custom_path = endpoint_path if endpoint_path.startswith("/") else f"/{endpoint_path}"
        if "embedContent" in custom_path:
            return [
                (
                    f"{normalized_base_url}{custom_path}",
                    {"model": f"models/{model_name}", "content": {"parts": [{"text": text}]}}
                )
            ]
        else:
            return [
                (
                    f"{normalized_base_url}{custom_path}",
                    {"contents": [{"parts": [{"text": text}]}]},
                )
            ]

    return [
        (
            f"{normalized_base_url}/v1beta/models/{model_name}:embedContent",
            {"model": f"models/{model_name}", "content": {"parts": [{"text": text}]}}
        ),
        (
            f"{normalized_base_url}/v1beta/models/{model_name}:generateContent",
            {"contents": [{"parts": [{"text": text}]}]},
        ),
    ]


def extract_embedding_vector(payload: Dict[str, Any]) -> List[float]:
    """兼容不同返回结构，从响应中提取向量字段。"""
    candidates = [
        payload.get("embedding", {}).get("values") if isinstance(payload.get("embedding"), dict) else None,
        payload.get("embedding"),
        payload.get("data", [{}])[0].get("embedding") if isinstance(payload.get("data"), list) and payload.get("data") else None,
        payload.get("embeddings", [{}])[0].get("values") if isinstance(payload.get("embeddings"), list) and payload.get("embeddings") else None,
    ]

    for candidate in candidates:
        if isinstance(candidate, list) and candidate:
            return [float(value) for value in candidate]

    raise ValueError(f"Gemini embedding 响应中未找到向量字段: {payload}")


class GeminiEmbeddings:
    """兼容 Gemini 风格 HTTP 接口的 Embedding 适配器。"""

    def __init__(self, base_url: str, api_key: str, model: str, timeout: int = 30, endpoint_path: str = ""):
        self.base_url = base_url
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.endpoint_path = endpoint_path

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_text(text) for text in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed_text(text)

    def _embed_text(self, text: str) -> List[float]:
        last_error: Exception | None = None
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        for url, payload in build_gemini_requests(self.base_url, self.model, text, self.endpoint_path):
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    return extract_embedding_vector(response.json())
            except Exception as exc:
                last_error = exc
                logger.warning(f"Gemini embedding 请求失败: {url} - {exc}")

        if last_error is not None:
            raise last_error
        raise RuntimeError("Gemini embedding 请求未执行")


@retry_with_backoff(max_retries=5, initial_delay=2.0)
def init_openai_compatible_embeddings():
    """初始化 OpenAI 兼容 Embedding 客户端。"""
    if not settings.EMBEDDING_API_KEY:
        raise ValueError("缺少 EMBEDDING_API_KEY，请在环境变量中配置")
    if not settings.EMBEDDING_MODEL:
        raise ValueError("缺少 EMBEDDING_MODEL，请在环境变量中配置")

    logger.info(f"正在连接 Embedding 服务: {settings.EMBEDDING_BASE_URL}")
    embeddings = OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL,
        base_url=settings.EMBEDDING_BASE_URL,
        api_key=settings.EMBEDDING_API_KEY,
    )
    embeddings.embed_query("test")
    logger.info(f"Embedding 模型 {settings.EMBEDDING_MODEL} 可用")
    return embeddings


@retry_with_backoff(max_retries=5, initial_delay=2.0)
def init_gemini_embeddings():
    """初始化 Gemini 风格 Embedding 客户端。"""
    if not settings.EMBEDDING_API_KEY:
        raise ValueError("缺少 EMBEDDING_API_KEY，请在环境变量中配置")
    if not settings.EMBEDDING_MODEL:
        raise ValueError("缺少 EMBEDDING_MODEL，请在环境变量中配置")

    logger.info(f"正在连接 Gemini Embedding 服务: {settings.EMBEDDING_BASE_URL}")
    embeddings = GeminiEmbeddings(
        base_url=settings.EMBEDDING_BASE_URL,
        api_key=settings.EMBEDDING_API_KEY,
        model=settings.EMBEDDING_MODEL,
        timeout=settings.REQUEST_TIMEOUT,
        endpoint_path=settings.GEMINI_EMBEDDING_PATH,
    )
    embeddings.embed_query("test")
    logger.info(f"Gemini Embedding 模型 {settings.EMBEDDING_MODEL} 可用")
    return embeddings


def create_embeddings() -> Any:
    """按配置返回 Embedding 客户端。"""
    if settings.EMBEDDING_PROVIDER == "openai_compatible":
        return init_openai_compatible_embeddings()
    if settings.EMBEDDING_PROVIDER == "gemini":
        return init_gemini_embeddings()
    raise ValueError(f"不支持的 EMBEDDING_PROVIDER: {settings.EMBEDDING_PROVIDER}")


async def check_embeddings_health() -> Dict[str, Any]:
    """检查 Embedding provider 健康状态。"""
    status: Dict[str, Any] = {
        "provider": settings.EMBEDDING_PROVIDER,
        "connected": False,
        "error": None,
        "model": settings.EMBEDDING_MODEL,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if settings.EMBEDDING_PROVIDER == "openai_compatible":
                response = await client.post(
                    build_api_url(settings.EMBEDDING_BASE_URL, "/embeddings"),
                    headers={
                        "Authorization": f"Bearer {settings.EMBEDDING_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={"model": settings.EMBEDDING_MODEL, "input": "health check"},
                )
                response.raise_for_status()
                status["connected"] = True
            elif settings.EMBEDDING_PROVIDER == "gemini":
                headers = {
                    "x-goog-api-key": settings.EMBEDDING_API_KEY,
                    "Content-Type": "application/json",
                }
                last_error = None
                for url, payload in build_gemini_requests(
                    settings.EMBEDDING_BASE_URL,
                    settings.EMBEDDING_MODEL,
                    "health check",
                    settings.GEMINI_EMBEDDING_PATH,
                ):
                    try:
                        response = await client.post(url, headers=headers, json=payload)
                        response.raise_for_status()
                        status["connected"] = True
                        break
                    except Exception as exc:
                        last_error = exc
                if not status["connected"] and last_error:
                    raise last_error
            else:
                raise ValueError(f"不支持的 EMBEDDING_PROVIDER: {settings.EMBEDDING_PROVIDER}")
    except Exception as exc:
        status["error"] = str(exc)

    return status
