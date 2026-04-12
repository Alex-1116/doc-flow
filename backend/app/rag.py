import time
import logging
from typing import Optional, List, Dict, Any
from functools import wraps

import chromadb
from chromadb.config import Settings
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from .config import settings

logger = logging.getLogger(__name__)


def retry_with_backoff(max_retries: int = 5, base_delay: float = 1.0, max_delay: float = 30.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay:.1f}s..."
                        )
                        time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator


class RAGEngine:
    _instance: Optional['RAGEngine'] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self._client: Optional[chromadb.HttpClient] = None
        self._embeddings: Optional[OllamaEmbeddings] = None
        self._llm: Optional[ChatOllama] = None
        self._text_splitter: Optional[RecursiveCharacterTextSplitter] = None
        self._initialized = True

    def _ensure_client(self) -> chromadb.HttpClient:
        if self._client is None:
            self._client = self._create_client()
        return self._client

    @retry_with_backoff(max_retries=5, base_delay=2.0, max_delay=30.0)
    def _create_client(self) -> chromadb.HttpClient:
        logger.info(f"Connecting to ChromaDB at {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
        client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
            settings=Settings(
                allow_reset=True,
                anonymized_telemetry=False
            )
        )
        client.heartbeat()
        logger.info("ChromaDB connection established successfully")
        return client

    @property
    def client(self) -> chromadb.HttpClient:
        return self._ensure_client()

    @property
    def embeddings(self) -> OllamaEmbeddings:
        if self._embeddings is None:
            self._embeddings = OllamaEmbeddings(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.EMBEDDING_MODEL,
            )
        return self._embeddings

    @property
    def llm(self) -> ChatOllama:
        if self._llm is None:
            self._llm = ChatOllama(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.MODEL_NAME,
                temperature=0,
            )
        return self._llm

    @property
    def text_splitter(self) -> RecursiveCharacterTextSplitter:
        if self._text_splitter is None:
            self._text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            )
        return self._text_splitter

    def _get_or_create_collection(self):
        try:
            return self.client.get_collection(settings.CHROMA_COLLECTION)
        except Exception:
            logger.info(f"Collection '{settings.CHROMA_COLLECTION}' not found, creating...")
            return self.client.create_collection(settings.CHROMA_COLLECTION)

    def get_vector_store(self) -> Chroma:
        self._get_or_create_collection()
        return Chroma(
            client=self.client,
            collection_name=settings.CHROMA_COLLECTION,
            embedding_function=self.embeddings,
        )

    def add_documents(self, documents: List[Document], metadatas: Optional[List[Dict[str, Any]]] = None) -> tuple[int, List[str]]:
        vector_store = self.get_vector_store()
        chunks = self.text_splitter.split_documents(documents)
        
        if metadatas and len(chunks) > 0:
            for chunk in chunks:
                chunk.metadata.update(metadatas[0])
        
        try:
            ids = vector_store.add_documents(chunks)
            logger.info(f"Successfully added {len(chunks)} chunks to vector store")
            return len(chunks), ids
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise

    def query(self, question: str, k: int = 4) -> Dict[str, Any]:
        vector_store = self.get_vector_store()

        prompt_template = """基于以下上下文回答用户的问题。如果不知道答案，就说不知道，不要编造答案。

上下文:
{context}

问题: {question}

请用中文回答:"""

        PROMPT = PromptTemplate(
            template=prompt_template, input_variables=["context", "question"]
        )

        chain_type_kwargs = {"prompt": PROMPT}

        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": k}),
            chain_type_kwargs=chain_type_kwargs,
            return_source_documents=True,
        )

        result = qa_chain({"query": question})

        return {
            "answer": result["result"],
            "sources": [
                {
                    "content": doc.page_content[:200],
                    "metadata": doc.metadata,
                }
                for doc in result["source_documents"]
            ],
        }

    def summarize(self, doc_id: str) -> str:
        return "文档摘要功能开发中..."

    def delete_document(self, doc_id: str) -> bool:
        try:
            collection = self._get_or_create_collection()
            collection.delete(where={"doc_id": doc_id})
            logger.info(f"Successfully deleted document {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False

    def health_check(self) -> Dict[str, Any]:
        health_status = {
            "chromadb": {"status": "unknown", "detail": ""},
            "ollama": {"status": "unknown", "detail": ""},
        }
        
        try:
            self.client.heartbeat()
            health_status["chromadb"]["status"] = "ok"
            health_status["chromadb"]["detail"] = f"{settings.CHROMA_HOST}:{settings.CHROMA_PORT}"
        except Exception as e:
            health_status["chromadb"]["status"] = "error"
            health_status["chromadb"]["detail"] = str(e)
        
        try:
            import requests
            response = requests.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                if settings.MODEL_NAME in model_names or any(settings.MODEL_NAME in name for name in model_names):
                    health_status["ollama"]["status"] = "ok"
                    health_status["ollama"]["detail"] = f"{settings.OLLAMA_BASE_URL} (model: {settings.MODEL_NAME})"
                else:
                    health_status["ollama"]["status"] = "warning"
                    health_status["ollama"]["detail"] = f"Model '{settings.MODEL_NAME}' not found. Available: {model_names}"
            else:
                health_status["ollama"]["status"] = "error"
                health_status["ollama"]["detail"] = f"HTTP {response.status_code}"
        except Exception as e:
            health_status["ollama"]["status"] = "error"
            health_status["ollama"]["detail"] = str(e)
        
        return health_status


rag_engine = RAGEngine()
