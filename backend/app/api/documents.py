import logging
import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.rag import get_rag_engine, RAGEngine
from app.models.schemas import DocumentDetailResponse
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
        # 即使 RAG 引擎（如 LLM/Embedding）初始化失败，也尝试直接读取 ChromaDB 以返回文档列表
        if rag._client is None:
            try:
                rag._client = rag._init_chroma_client()
            except Exception as e:
                logger.warning(f"无法连接 ChromaDB: {e}")
                return JSONResponse({"documents": []})

        try:
            coll = rag._client.get_collection(settings.CHROMA_COLLECTION)
            results = coll.get(include=["metadatas"])
        except Exception:
            # 集合不存在或其他 ChromaDB 错误时，返回空列表
            return JSONResponse({"documents": []})
        
        docs_map = {}
        for meta in (results.get("metadatas") or []):
            if not meta:
                continue
            doc_id = meta.get("doc_id")
            if doc_id and doc_id not in docs_map:
                docs_map[doc_id] = {
                    "id": doc_id,
                    "name": meta.get("filename", "未知文档"),
                    "chunks": 0
                }
            if doc_id:
                docs_map[doc_id]["chunks"] += 1
                
        return JSONResponse({"documents": list(docs_map.values())})
    except Exception as e:
        logger.error(f"列出文档失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"列出文档失败: {str(e)}")


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
async def get_document_detail(doc_id: str, rag: RAGEngine = Depends(get_rag)):
    """获取文档详情和正文预览"""
    try:
        detail = rag.get_document_detail(doc_id)
        if not detail:
            raise HTTPException(status_code=404, detail="文档不存在")

        return detail
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文档详情失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取文档详情失败: {str(e)}")
