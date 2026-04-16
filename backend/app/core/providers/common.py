import asyncio
import logging
import time
from functools import wraps


logger = logging.getLogger(__name__)


def retry_with_backoff(max_retries: int = 5, initial_delay: float = 1.0, backoff_factor: float = 2.0):
    """同步重试装饰器。"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    last_exception = exc
                    # 如果是 401 或 403 权限错误，不重试，直接抛出
                    if "401" in str(exc) or "403" in str(exc):
                        logger.error(f"{func.__name__} 权限错误，不重试: {exc}")
                        raise exc
                    if attempt < max_retries - 1:
                        logger.warning(f"{func.__name__} 第 {attempt + 1} 次尝试失败: {exc}, {delay}秒后重试...")
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(f"{func.__name__} 所有重试都失败了: {exc}")
            raise last_exception

        return wrapper

    return decorator


def async_retry_with_backoff(max_retries: int = 5, initial_delay: float = 1.0, backoff_factor: float = 2.0):
    """异步重试装饰器。"""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as exc:
                    last_exception = exc
                    # 如果是 401 或 403 权限错误，不重试，直接抛出
                    if "401" in str(exc) or "403" in str(exc):
                        logger.error(f"{func.__name__} 权限错误，不重试: {exc}")
                        raise exc
                    if attempt < max_retries - 1:
                        logger.warning(f"{func.__name__} 第 {attempt + 1} 次尝试失败: {exc}, {delay}秒后重试...")
                        await asyncio.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(f"{func.__name__} 所有重试都失败了: {exc}")
            raise last_exception

        return wrapper

    return decorator


def build_api_url(base_url: str, path: str) -> str:
    """拼接 API 路径，避免基础路径被覆盖。"""
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"
