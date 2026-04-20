import uuid
import logging
from pathlib import Path
from contextlib import contextmanager

from app.core.config import settings

logger = logging.getLogger(__name__)

def save_uploaded_file(file_content: bytes, filename: str) -> str:
    """
    保存上传的文件到临时目录

    Args:
        file_content: 文件内容
        filename: 文件名

    Returns:
        保存的文件路径
    """
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix
    save_path = upload_dir / f"{file_id}{ext}"

    try:
        with open(save_path, "wb") as f:
            f.write(file_content)
        logger.debug(f"文件已保存到 {save_path}")
        return str(save_path)
    except Exception as e:
        logger.error(f"保存文件失败: {e}")
        raise

def cleanup_file(file_path: str) -> bool:
    """
    清理临时文件

    Args:
        file_path: 文件路径

    Returns:
        是否成功删除
    """
    if not file_path:
        return True

    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            logger.debug(f"已删除临时文件: {file_path}")
        return True
    except PermissionError as e:
        logger.warning(f"没有权限删除文件 {file_path}: {e}")
        return False
    except FileNotFoundError:
        # 文件不存在，视为成功
        return True
    except Exception as e:
        logger.error(f"删除文件 {file_path} 失败: {e}")
        return False

@contextmanager
def managed_temp_file(file_content: bytes, filename: str):
    """
    上下文管理器 - 安全地管理临时文件

    确保即使在异常情况下也能清理临时文件
    """
    temp_path = None
    try:
        temp_path = save_uploaded_file(file_content, filename)
        yield temp_path
    finally:
        if temp_path:
            cleanup_file(temp_path)
