import jwt
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Dict, Optional
from fastapi import HTTPException, status
from app.core.config import settings

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    生成 JWT Access Token。
    
    :param subject: Token 的主体（通常是用户的 ID 或用户名）
    :param expires_delta: 过期时间，如果未提供则使用默认的 ACCESS_TOKEN_EXPIRE_MINUTES
    :return: 编码后的 JWT 字符串
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    解码并验证 JWT Token。
    
    :param token: JWT 字符串
    :return: 解码后的 payload 字典
    :raises HTTPException: 当 token 无效或已过期时抛出 401 异常
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 已过期，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )
