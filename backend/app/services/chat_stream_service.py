import json
import logging
from typing import AsyncGenerator

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from app.core.agents.main import get_docflow_agent
from app.core.vector_store import VectorStoreManager

logger = logging.getLogger(__name__)

class ChatStreamService:
    def __init__(self, vector_store_manager: VectorStoreManager):
        self.vsm = vector_store_manager

    async def stream_query(self, question: str, k: int = 4, session_id: str = "default_session") -> AsyncGenerator[str, None]:
        vector_store = self.vsm.get_vector_store()
        retriever = vector_store.as_retriever(search_kwargs={"k": k})
        llm = self.vsm.get_llm()
        app = get_docflow_agent(llm=llm, retriever=retriever)

        config = {"configurable": {"thread_id": session_id}}
        inputs = {
            "documents": [], 
            "k": k, 
            "iterations": 0,
            "messages": [HumanMessage(content=question)],
            "next_worker": "",
            "doc_id": None
        }

        yield json.dumps({"status": "analyzing", "message": "🧠 思考中... 正在分析问题"}) + "\n"

        # 异步遍历 LangGraph 的中间状态
        async for event in app.astream(inputs, config=config, stream_mode="updates"):
            # event 是一个字典，键是 node 名称，值是 node 输出的 state
            for node_name, node_state in event.items():
                if node_name == "supervisor":
                    worker_map = {"rag_agent": "知识库搜索", "summary_agent": "文档总结", "general_agent": "日常对话"}
                    task_type = worker_map.get(node_state.get('next_worker'), "专业解答")
                    yield json.dumps({"status": "analyzing", "message": f"🤔 正在准备进行 {task_type}..."}) + "\n"
                
                elif node_name == "rag_agent":
                    messages = node_state.get("messages", [])
                    if not messages:
                        continue
                    last_msg = messages[-1]
                    
                    if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
                        query = last_msg.tool_calls[0]["args"].get("query", "") if last_msg.tool_calls else ""
                        yield json.dumps({"status": "retrieving", "message": f"🔍 检索中... 正在搜索知识库关键词: '{query}'"}) + "\n"
                    
                    elif isinstance(last_msg, ToolMessage):
                        yield json.dumps({"status": "analyzing", "message": f"📑 阅读中... 正在分析找到的相关资料"}) + "\n"
                    
                    elif isinstance(last_msg, AIMessage) and not last_msg.tool_calls:
                        pass
        
        # 结束后，我们通过读取 checkpointer 里的最新状态来拿到结果
        # 因为 astream 跑完后状态已经被保存
        final_state = app.get_state(config).values
        
        final_answer = ""
        sources = []
        if final_state.get("messages"):
            final_answer = final_state["messages"][-1].content
            sources = [
                {"content": doc.page_content[:200], "metadata": doc.metadata}
                for doc in final_state.get("documents", [])
            ]
            
        yield json.dumps({
            "status": "done", 
            "message": "✅ 生成完毕", 
            "answer": final_answer, 
            "sources": sources
        }) + "\n"
