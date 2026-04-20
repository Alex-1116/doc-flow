import logging
from typing import Dict, Any

from langchain_core.messages import HumanMessage

from app.core.agents.main import get_docflow_agent
from app.core.vector_store import VectorStoreManager
from app.core.providers.common import retry_with_backoff

logger = logging.getLogger(__name__)

class ChatService:
    """负责对话和查询的业务逻辑"""

    def __init__(self, vector_store_manager: VectorStoreManager):
        self.vsm = vector_store_manager

    @retry_with_backoff(max_retries=3, initial_delay=1.0)
    def query(self, question: str, k: int = 4, session_id: str = "default_session") -> Dict[str, Any]:
        """基于 LangGraph 架构查询文档"""
        vector_store = self.vsm.get_vector_store()
        retriever = vector_store.as_retriever(search_kwargs={"k": k})

        # 获取 LLM 实例
        llm = self.vsm.get_llm()

        # 获取包含多个子 Agent 的超级执行图
        app = get_docflow_agent(llm=llm, retriever=retriever)

        # 执行 Super Graph，传入 config 启用记忆
        config = {"configurable": {"thread_id": session_id}}
        inputs = {
            "documents": [], 
            "k": k, 
            "iterations": 0,
            "messages": [HumanMessage(content=question)],
            "next_worker": "",
            "doc_id": None
        }
        result = app.invoke(inputs, config=config)

        # 无论最终是哪个子 Agent 执行的，结果都在 messages 列表的最后一个元素中
        final_answer = ""
        if result.get("messages"):
            final_answer = result["messages"][-1].content

        return {
            "answer": final_answer,
            "sources": [
                {
                    "content": doc.page_content[:200],
                    "metadata": doc.metadata,
                }
                for doc in result.get("documents", [])
            ]
        }

    def summarize(self, doc_id: str) -> str:
        """文档摘要功能"""
        return "文档摘要功能开发中..."
