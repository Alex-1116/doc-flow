from app.core.agents.supervisor.graph import build_supervisor_graph
from langgraph.checkpoint.memory import MemorySaver

# 全局共享的内存对象，确保多个请求之间共享同一个会话记忆
_global_memory = MemorySaver()

def get_docflow_agent(llm, retriever):
    """
    返回 DocFlow 系统级 Agent 的统一入口
    目前接入的是 Supervisor 模式的 Multi-Agent 架构
    """
    return build_supervisor_graph(llm, retriever, memory=_global_memory)