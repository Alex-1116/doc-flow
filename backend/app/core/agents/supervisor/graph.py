import logging
from typing import Dict, Any, Literal
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field

from app.core.agents.shared import GlobalState
from app.core.agents.rag_agent import build_rag_agent_graph
from app.core.agents.summary_agent import build_summary_agent_graph

logger = logging.getLogger(__name__)

# ==========================================
# 1. State Definition
# ==========================================
class SupervisorState(GlobalState):
    """
    Supervisor 的状态，继承自 GlobalState
    增加下一步要派发的 worker 名称
    """
    next_worker: str
    doc_id: str | None # 用于总结任务的文档ID

# ==========================================
# 2. Nodes Definition
# ==========================================
class SupervisorNodes:
    def __init__(self, llm):
        self.llm = llm

    def route_task(self, state: SupervisorState) -> Dict[str, Any]:
        """
        主管节点：分析用户意图，决定把任务派发给哪个子 Agent
        """
        logger.info("👨‍💼 执行节点: supervisor_node (任务分发)")
        messages = state.get("messages", [])
        
        if not messages:
            return {"next_worker": "end"}
            
        last_user_msg = ""
        for msg in reversed(messages):
            if isinstance(msg, HumanMessage):
                last_user_msg = msg.content
                break
                
        # 简单的意图识别逻辑 (可以通过 LLM 结构化输出来做，这里为了演示做简单判断)
        if "总结" in last_user_msg and "文档" in last_user_msg:
            logger.info("👨‍💼 主管决定: 派发给 Summary Agent")
            # 假设提取出了 doc_id
            return {"next_worker": "summary_agent", "doc_id": "doc_123"}
        else:
            logger.info("👨‍💼 主管决定: 派发给 RAG Agent")
            return {"next_worker": "rag_agent"}

# ==========================================
# 3. Graph Builder
# ==========================================
def build_supervisor_graph(llm, retriever):
    """
    构建包含多个子 Agent 的超级图 (Super Graph)
    """
    # 1. 实例化子 Agent (它们本身就是编译好的 LangGraph)
    rag_agent_app = build_rag_agent_graph(llm, retriever)
    summary_agent_app = build_summary_agent_graph(llm)
    
    # 2. 实例化主管节点
    supervisor_nodes = SupervisorNodes(llm=llm)
    
    # 3. 构建总图
    super_graph = StateGraph(SupervisorState)
    
    # 注册节点
    super_graph.add_node("supervisor", supervisor_nodes.route_task)
    
    # 将子 Agent 作为 Node 塞进总图里！
    super_graph.add_node("rag_agent", rag_agent_app)
    super_graph.add_node("summary_agent", summary_agent_app)
    
    # 设定入口节点为主管
    super_graph.set_entry_point("supervisor")
    
    # 定义主管的路由逻辑
    def supervisor_router(state: SupervisorState) -> str:
        return state.get("next_worker", "end")
        
    super_graph.add_conditional_edges(
        "supervisor",
        supervisor_router,
        {
            "rag_agent": "rag_agent",
            "summary_agent": "summary_agent",
            "end": END
        }
    )
    
    # 子 Agent 执行完毕后，直接结束 (或者回到主管)
    super_graph.add_edge("rag_agent", END)
    super_graph.add_edge("summary_agent", END)
    
    return super_graph.compile()