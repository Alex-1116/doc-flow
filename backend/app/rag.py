import os
import chromadb
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import settings


class RAGEngine:
    def __init__(self):
        try:
            self.client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
            )
        except Exception:
            from chromadb.config import Settings
            self.client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=Settings(allow_reset=True, anonymized_telemetry=False)
            )
        self.embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.EMBEDDING_MODEL,
        )
        self.llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.MODEL_NAME,
            temperature=0,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

    def get_vector_store(self):
        return Chroma(
            client=self.client,
            collection_name=settings.CHROMA_COLLECTION,
            embedding_function=self.embeddings,
        )

    def add_documents(self, documents, metadatas=None):
        vector_store = self.get_vector_store()
        chunks = self.text_splitter.split_documents(documents)
        
        if metadatas and len(chunks) > 0:
            for chunk in chunks:
                chunk.metadata.update(metadatas[0])
        
        ids = vector_store.add_documents(chunks)
        return len(chunks), ids

    def query(self, question: str, k: int = 4):
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

    def summarize(self, doc_id: str):
        return "文档摘要功能开发中..."

    def delete_document(self, doc_id: str):
        try:
            collection = self.client.get_collection(settings.CHROMA_COLLECTION)
            collection.delete(where={"doc_id": doc_id})
            return True
        except Exception:
            return False


rag_engine = RAGEngine()
