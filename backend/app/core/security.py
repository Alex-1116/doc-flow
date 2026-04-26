from passlib.context import CryptContext

# 密码哈希上下文配置（使用 bcrypt 算法）
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证用户输入的明文密码是否与数据库中存储的哈希密码匹配。
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    将明文密码转换为 bcrypt 哈希字符串以安全存储。
    """
    return pwd_context.hash(password)
