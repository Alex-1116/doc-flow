import uuid
import secrets
import string
from datetime import datetime, timezone
from typing import Any

def generate_uuid() -> str:
    """
    生成一个标准 UUID4 字符串（不带短横线，更短凑凑合合）
    """
    return uuid.uuid4().hex

def generate_random_string(length: int = 8) -> str:
    """
    生成指定长度的随机字符串，包含大小写字母和数字。
    常用于生成验证码、随机密码等。
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def get_current_utc_time() -> datetime:
    """
    获取当前标准的 UTC 时间对象，带有时区信息。
    """
    return datetime.now(timezone.utc)

def format_datetime(dt: datetime, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    将 datetime 对象格式化为常见的字符串形式。
    """
    return dt.strftime(fmt)
