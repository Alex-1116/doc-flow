import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.rag import rag_engine
from app.parsers import DocumentParser, save_uploaded_file, cleanup_file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DocFlow service...")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    logger.info("Initializing RAG Engine in lifespan...")
    try:
        rag_engine.initialize()
        logger.info("RAG Engine initialized successfully in lifespan")
    except Exception as e:
        logger.error(f"RAG Engine initialization failed (will retry on first access): {e}")

    yield
    logger.info("Shutting down DocFlow service...")


app = FastAPI(
    title="DocFlow API",
    description="智能文档摘要与问答系统 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    ollama: str
    chromadb: str
    details: Optional[str] = None


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    healthy, details = rag_engine.health_check()
    if healthy:
        return HealthResponse(
            status="ok",
            ollama="ok",
            chromadb="ok",
            details=details,
        )
    return HealthResponse(
        status="degraded",
        ollama="error" if "Ollama" in details else "ok",
        chromadb="error" if "ChromaDB" in details else "ok",
        details=details,
    )


@app.post("/api/documents/upload")
@limiter.limit("5/minute")
async def upload_document(request: Request, file: UploadFile = File(...)):
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
        logger.info(f"Processing file: {file.filename} -> {temp_path}")

        documents, doc_id, metadata = DocumentParser.parse(temp_path, file.filename)

        chunk_count, vector_ids = rag_engine.add_documents(documents, [metadata])

        logger.info(f"Successfully processed {file.filename}: {chunk_count} chunks")

        return JSONResponse(
            {
                "doc_id": doc_id,
                "filename": file.filename,
                "chunks": chunk_count,
                "status": "success",
            }
        )

    except Exception as e:
        logger.error(f"Error processing file {file.filename if file else 'unknown'}: {e}")
        raise HTTPException(status_code=500, detail=f"处理文件失败: {str(e)}")
    finally:
        if temp_path:
            cleanup_file(temp_path)
            logger.debug(f"Cleaned up temp file: {temp_path}")


@app.post("/api/query")
@limiter.limit("20/minute")
async def query_documents(request: Request, query_request: QueryRequest):
    try:
        logger.info(f"Processing query: {query_request.question[:50]}...")
        result = rag_engine.query(query_request.question, query_request.k)
        return JSONResponse(result)
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


@app.post("/api/summarize/{doc_id}")
@limiter.limit("10/minute")
async def summarize_document(request: Request, doc_id: str):
    try:
        summary = rag_engine.summarize(doc_id)
        return JSONResponse({"doc_id": doc_id, "summary": summary})
    except Exception as e:
        logger.error(f"Summarize failed: {e}")
        raise HTTPException(status_code=500, detail=f"生成摘要失败: {str(e)}")


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    success = rag_engine.delete_document(doc_id)
    if success:
        return JSONResponse({"status": "success", "doc_id": doc_id})
    raise HTTPException(status_code=404, detail="文档不存在或删除失败")


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

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        timeout_keep_alive=120,
    )
