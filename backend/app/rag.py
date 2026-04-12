import logging
import time
import uuid
from typing import Optional, List, Tuple, Any
from functools import wraps

import chromadb
from langchain_chroma import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain.chains.retrieval_qa.base import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log

from .config import settings

logger = logging.getLogger(__name__)


def with_retry(attempts: int = 5):
    def decorator(func):
        @wraps(func)
        @retry(
            stop=stop_after_attempt(attempts),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_exception_type((ConnectionError, TimeoutError, Exception)),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            reraise=True,
        )
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator


class RAGEngine:
    _instance: Optional["RAGEngine"] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.client: Optional[chromadb.ClientAPI] = None
        self.embeddings: Optional[OllamaEmbeddings] = None
        self.llm: Optional[ChatOllama] = None
        self.text_splitter: Optional[RecursiveCharacterTextSplitter] = None
        self._initialized = True

    @with_retry(attempts=10)
    def _connect_chromadb(self) -> chromadb.ClientAPI:
        logger.info(f"Connecting to ChromaDB at {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
        try:
            client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=chromadb.Settings(
                    allow_reset=True,
                    anonymized_telemetry=False,
                ),
            )
            client.heartbeat()
            logger.info("Successfully connected to ChromaDB")
            return client
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            raise ConnectionError(f"ChromaDB connection failed: {e}") from e

    @with_retry(attempts=5)
    def _init_ollama_components(self) -> Tuple[OllamaEmbeddings, ChatOllama]:
        logger.info(f"Initializing Ollama components at {settings.OLLAMA_BASE_URL}")
        try:
            import httpx
            response = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=10)
            response.raise_for_status()
        except Exception as e:
            logger.warning(f"Ollama health check warning: {e}")

        embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.EMBEDDING_MODEL,
            client_kwargs={"timeout": 120},
        )
        llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.MODEL_NAME,
            temperature=0,
            timeout=120,
        )
        logger.info("Ollama components initialized")
        return embeddings, llm

    def initialize(self) -> None:
        logger.info("Initializing RAG Engine...")
        self.client = self._connect_chromadb()
        self.embeddings, self.llm = self._init_ollama_components()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
        self._ensure_collection_exists()
        logger.info("RAG Engine initialized successfully")

    def _ensure_collection_exists(self) -> None:
        if not self.client:
            raise RuntimeError("RAG Engine not initialized")
        try:
            self.client.get_collection(settings.CHROMA_COLLECTION)
            logger.info(f"Collection {settings.CHROMA_COLLECTION} exists")
        except chromadb.CollectionNotFoundError:
            logger.info(f"Creating collection {settings.CHROMA_COLLECTION}")
            self.client.create_collection(settings.CHROMA_COLLECTION)
        except Exception as e:
            logger.warning(f"Collection check warning, attempting creation: {e}")
            try:
                self.client.create_collection(settings.CHROMA_COLLECTION)
            except Exception as e2:
                logger.warning(f"Collection creation also had warning: {e2}")

    def _check_initialized(self) -> None:
        if not self._initialized or not self.client:
            raise RuntimeError("RAG Engine not initialized. Call initialize() first.")

    def get_vector_store(self) -> Chroma:
        self._check_initialized()
        return Chroma(
            client=self.client,
            collection_name=settings.CHROMA_COLLECTION,
            embedding_function=self.embeddings,
        )

    @with_retry(attempts=3)
    def add_documents(self, documents, metadatas=None) -> Tuple[int, List[str]]:
        self._check_initialized()
        vector_store = self.get_vector_store()
        chunks = self.text_splitter.split_documents(documents)

        if metadatas and len(chunks) > 0:
            for chunk in chunks:
                chunk.metadata.update(metadatas[0])

        chunk_ids = [str(uuid.uuid4()) for _ in chunks]
        logger.info(f"Adding {len(chunks)} chunks to vector store")

        try:
            ids = vector_store.add_documents(chunks, ids=chunk_ids)
            return len(chunks), ids
        except Exception as e:
            logger.error(f"Error adding documents, attempting cleanup: {e}")
            try:
                collection = self.client.get_collection(settings.CHROMA_COLLECTION)
                existing_ids = set(collection.get(ids=chunk_ids)["ids"])
                if existing_ids:
                    collection.delete(ids=list(existing_ids))
                    logger.warning(f"Rolled back {len(existing_ids)} partially added vectors")
            except Exception as cleanup_error:
                logger.error(f"Cleanup also failed: {cleanup_error}")
            raise

    @with_retry(attempts=2)
    def query(self, question: str, k: int = 4) -> dict[str, Any]:
        self._check_initialized()
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

        result = qa_chain.invoke({"query": question})

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

    def summarize(self, doc_id: str):
        return "文档摘要功能开发中..."

    def delete_document(self, doc_id: str) -> bool:
        self._check_initialized()
        try:
            collection = self.client.get_collection(settings.CHROMA_COLLECTION)
            result = collection.delete(where={"doc_id": doc_id})
            logger.info(f"Deleted document {doc_id}")
            return True
        except chromadb.CollectionNotFoundError:
            logger.warning(f"Collection not found when deleting document {doc_id}")
            return False
        except Exception as e:
            logger.error(f"Error deleting document {doc_id}: {e}")
            return False

    def health_check(self) -> Tuple[bool, str]:
        try:
            if not self.client:
                return False, "ChromaDB not initialized"
            self.client.heartbeat()
            chroma_status = "ok"
        except Exception as e:
            return False, f"ChromaDB error: {str(e)}"

        try:
            import httpx
            httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
            ollama_status = "ok"
        except Exception as e:
            return False, f"Ollama error: {str(e)}"

        return True, f"ChromaDB: {chroma_status}, Ollama: {ollama_status}"


rag_engine = RAGEngine()
