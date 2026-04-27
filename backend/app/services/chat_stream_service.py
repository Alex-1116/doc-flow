import json
import logging
from typing import AsyncGenerator

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from app.core.agents.main import get_docflow_agent
from app.core.vector_store import VectorStoreManager
from app.db.database import AsyncSessionLocal
from app.db.crud.chat import chat_message, chat_session
from app.schemas.chat import ChatMessageCreate, ChatSessionCreate

logger = logging.getLogger(__name__)

class ChatStreamService:
    def __init__(self, vector_store_manager: VectorStoreManager):
        self.vsm = vector_store_manager

    async def stream_query(self, question: str, k: int = 4, session_id: str = "default_session") -> AsyncGenerator[str, None]:
        # 校验 session_id，如果是空字符串则自动生成
        if not session_id:
            from app.utils.common import generate_uuid
            session_id = generate_uuid()
            
        # 自动在数据库中记录 User 的消息
        async with AsyncSessionLocal() as db:
            session = await chat_session.get(db, id=session_id)
            if not session:
                # 自动创建 session，以第一条消息截断作为 title
                title = question[:15] + "..." if len(question) > 15 else question
                # 使用底层 ORM 或 CRUD 方法手动指定 ID
                from app.db.models.chat import ChatSession
                db_session = ChatSession(id=session_id, title=title)
                db.add(db_session)
                await db.commit()
            
            await chat_message.create(
                db, 
                obj_in=ChatMessageCreate(session_id=session_id, role="user", content=question)
            )

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
        async for namespace, chunk in app.astream(inputs, config=config, stream_mode="updates", subgraphs=True):
            # namespace 标识了当前是在顶层图还是子图中 (例如: (), ("rag_agent",) 等)
            # chunk 是节点输出的更新字典
            for node_name, node_state in chunk.items():
                if node_name == "supervisor":
                    worker_map = {"rag_agent": "知识库搜索", "summary_agent": "文档总结", "general_agent": "日常对话"}
                    task_type = worker_map.get(node_state.get('next_worker'), "专业解答")
                    yield json.dumps({"status": "analyzing", "message": f"🤔 正在准备进行 {task_type}..."}) + "\n"
                
                # 监听 rag_agent 子图内部的 agent 节点（大脑）
                elif node_name == "agent" and any(ns.startswith("rag_agent") for ns in namespace):
                    messages = node_state.get("messages", [])
                    if not messages:
                        continue
                    last_msg = messages[-1]
                    
                    if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
                        tool_call = last_msg.tool_calls[0]
                        query = tool_call["args"].get("query", "")
                        details = json.dumps(tool_call["args"], ensure_ascii=False, indent=2)
                        yield json.dumps({
                            "status": "retrieving", 
                            "message": f"🔍 检索中... 正在搜索知识库关键词: '{query}'",
                            "details": f"```json\n{details}\n```"
                        }) + "\n"
                        
                # 监听 rag_agent 子图内部的 tools 节点（执行工具）
                elif node_name == "tools" and any(ns.startswith("rag_agent") for ns in namespace):
                    messages = node_state.get("messages", [])
                    if not messages:
                        continue
                    last_msg = messages[-1]
                    
                    if isinstance(last_msg, ToolMessage):
                        content = last_msg.content
                        if isinstance(content, list):
                            content = str(content)
                        details = content[:500] + ("..." if len(content) > 500 else "")
                        yield json.dumps({
                            "status": "analyzing", 
                            "message": f"📑 阅读中... 正在分析找到的相关资料",
                            "details": f"```text\n{details}\n```"
                        }) + "\n"
        
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
            
            # 自动在数据库中记录 AI 的回复消息
            async with AsyncSessionLocal() as db:
                await chat_message.create(
                    db,
                    obj_in=ChatMessageCreate(
                        session_id=session_id, 
                        role="assistant", 
                        content=final_answer
                    )
                )
            
        yield json.dumps({
            "status": "done", 
            "message": "✅ 生成完毕", 
            "answer": final_answer, 
            "sources": sources
        }) + "\n"
