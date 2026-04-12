import logging
import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.rag import get_rag_engine, RAGEngine
from app.services.parsers import DocumentParser, managed_temp_file

logger = logging.getLogger(__name__)
router = APIRouter()

def get_rag() -> RAGEngine:
    return get_rag_engine()

@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    rag: RAGEngine = Depends(get_rag),
):
    """上传文档端点 - 带并发控制和资源管理"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="请选择文件")

    if not DocumentParser.is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。支持格式: {', '.join(DocumentParser.get_supported_formats())}",
        )

    upload_semaphore = request.app.state.upload_semaphore
    
    # 使用信号量控制并发
    async with upload_semaphore:
        try:
            content = await file.read()

            if len(content) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"文件过大，最大支持 {settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
                )

            # 使用上下文管理器确保资源释放
            with managed_temp_file(content, file.filename) as temp_path:
                documents, doc_id, metadata = DocumentParser.parse(temp_path, file.filename)
                chunk_count, vector_ids = rag.add_documents(documents, [metadata])

            return JSONResponse(
                {
                    "doc_id": doc_id,
                    "filename": file.filename,
                    "chunks": chunk_count,
                    "status": "success",
                }
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"处理文件失败: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"处理文件失败: {str(e)}")

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, rag: RAGEngine = Depends(get_rag)):
    """删除文档端点"""
    try:
        success = rag.delete_document(doc_id)
        if success:
            return JSONResponse({"status": "success", "doc_id": doc_id})
        else:
            raise HTTPException(status_code=500, detail="删除文档失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除文档失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除文档失败: {str(e)}")

@router.get("")
async def list_documents(rag: RAGEngine = Depends(get_rag)):
    """列出所有文档"""
    try:
        # 获取向量存储并查询所有文档
        vector_store = rag.get_vector_store()
        # 这里可以通过元数据查询获取所有文档
        # 由于 ChromaDB 的限制，我们返回空列表
        return JSONResponse({"documents": []})
    except Exception as e:
        logger.error(f"列出文档失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"列出文档失败: {str(e)}")
