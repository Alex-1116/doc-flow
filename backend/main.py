import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.rag import rag_engine
from app.parsers import DocumentParser, save_uploaded_file, cleanup_file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"Upload directory created: {settings.UPLOAD_DIR}")
    
    try:
        health = rag_engine.health_check()
        logger.info(f"Initial health check: {health}")
    except Exception as e:
        logger.warning(f"Initial health check failed (services may not be ready): {e}")
    
    yield


app = FastAPI(
    title="DocFlow API",
    description="智能文档摘要与问答系统 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str
    k: int = 4


class HealthResponse(BaseModel):
    status: str
    chromadb: dict
    ollama: dict


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    health = rag_engine.health_check()
    
    overall_status = "ok"
    if health["chromadb"]["status"] == "error" or health["ollama"]["status"] == "error":
        overall_status = "error"
    elif health["chromadb"]["status"] == "warning" or health["ollama"]["status"] == "warning":
        overall_status = "warning"
    
    return HealthResponse(
        status=overall_status,
        chromadb=health["chromadb"],
        ollama=health["ollama"],
    )


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="请选择文件")

    if not DocumentParser.is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。支持格式: {', '.join(DocumentParser.get_supported_formats())}",
        )

    temp_path = None
    try:
        content = await file.read()

        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="文件过大")

        temp_path = save_uploaded_file(content, file.filename)
        logger.info(f"File saved to: {temp_path}")

        documents, doc_id, metadata = DocumentParser.parse(temp_path, file.filename)
        logger.info(f"Document parsed: {doc_id}, {len(documents)} pages/sections")

        chunk_count, vector_ids = rag_engine.add_documents(documents, [metadata])
        logger.info(f"Added {chunk_count} chunks to vector store")

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
        logger.error(f"Failed to process file {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"处理文件失败: {str(e)}")
    finally:
        if temp_path:
            cleanup_file(temp_path)


@app.post("/api/query")
async def query_documents(request: QueryRequest):
    try:
        result = rag_engine.query(request.question, request.k)
        return JSONResponse(result)
    except Exception as e:
        logger.error(f"Query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


@app.post("/api/summarize/{doc_id}")
async def summarize_document(doc_id: str):
    try:
        summary = rag_engine.summarize(doc_id)
        return JSONResponse({"doc_id": doc_id, "summary": summary})
    except Exception as e:
        logger.error(f"Summarize failed for {doc_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"生成摘要失败: {str(e)}")


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    success = rag_engine.delete_document(doc_id)
    if success:
        return JSONResponse({"status": "success", "doc_id": doc_id})
    raise HTTPException(status_code=404, detail="文档不存在")


@app.get("/api/formats")
async def get_supported_formats():
    return JSONResponse(
        {
            "formats": DocumentParser.get_supported_formats(),
            "max_size": settings.MAX_FILE_SIZE,
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
