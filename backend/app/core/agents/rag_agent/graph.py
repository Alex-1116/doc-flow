import logging
from typing import List, Dict, Any, Literal, Optional, Sequence, Annotated
from typing_extensions import TypedDict
import json

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, BaseMessage, SystemMessage
from langgraph.graph import StateGraph, END
from app.core.agents.shared import BaseAgentState

logger = logging.getLogger(__name__)

# ==========================================
# 1. State Definition
# ==========================================
class RagAgentState(BaseAgentState):
    """
    RAG Agent 专属状态
    继承自 BaseAgentState (包含 messages 和 iterations)
    """
    documents: List[Document]  # RAG Agent 需要维护检索到的文档
    k: int                     # 检索文档数量参数


# ==========================================
# 1.5. Tools Schema Definition
# ==========================================
# 定义供大模型识别的工具说明书
search_tool_schema = {
    "name": "search_documents",
    "description": "当用户需要查找知识库、阅读文档细节、或者需要从已上传的文件中提取信息时，必须调用此工具。",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "用于在知识库中进行向量检索的精确关键词或短语"
            }
        },
        "required": ["query"]
    }
}


# ==========================================
# 2. Nodes Definition
# ==========================================
class AgentNodes:
    """
    管理核心 Agent 节点
    """
    def __init__(self, llm, retriever):
        self.llm = llm
        self.retriever = retriever
        # 将我们定义的工具说明书绑定给 LLM
        self.llm_with_tools = llm.bind_tools([search_tool_schema])

    def agent_node(self, state: RagAgentState) -> Dict[str, Any]:
        """
        核心大脑节点：负责思考、对话，并决定是否调用工具。
        """
        logger.info(f"🧠 执行节点: agent_node")
        messages = state.get("messages", [])
            
        # 增加系统提示词，规范它的行为
        # 使用标准的 SystemMessage 而不是 HumanMessage
        sys_msg = SystemMessage(content=(
            "你是一个专业的智能文档助手。你可以调用工具来查询知识库中的文档。\n"
            "如果用户的问题涉及文档内容、知识库、总结、对比等，请务必先调用 search_documents 工具获取信息。\n"
            "如果只是一般性问候（如'你好'），可以直接回答。\n"
            "在回答时，请保持专业、清晰，并用中文回答。"
        ))
        
        # 检查是否已经包含了系统提示词，如果没有，将其插在最前面
        invoke_messages = list(messages)  # 创建副本以避免修改原始状态
        
        # 确保只有第一条消息是 SystemMessage，并且是我们定义的这个
        if not invoke_messages or not isinstance(invoke_messages[0], SystemMessage):
            invoke_messages.insert(0, sys_msg)
        elif invoke_messages[0].content != sys_msg.content:
            # 如果已经有 SystemMessage 但内容不对，替换它
            invoke_messages[0] = sys_msg
            
        # ==========================================
        # 滑动窗口记忆截断 (Sliding Window Memory)
        # ==========================================
        # 限制发给大模型的消息总数，避免 Token 爆炸和 Lost in the Middle 现象。
        # 我们保留第一条 SystemMessage，以及最近的 10 条对话消息（相当于最近 5 轮对话）。
        MAX_MESSAGES = 10
        if len(invoke_messages) > MAX_MESSAGES + 1:
            logger.info(f"触发滑动窗口记忆截断: 原消息数 {len(invoke_messages)}，截断为 {MAX_MESSAGES + 1}")
            invoke_messages = [invoke_messages[0]] + invoke_messages[-MAX_MESSAGES:]
        
        # 调用大模型
        response = self.llm_with_tools.invoke(invoke_messages)
        
        # 记录迭代次数
        current_iterations = state.get("iterations", 0)
        
        # 将大模型的回复（可能是普通文本，也可能是 ToolCall 请求）追加到消息列表中
        return {"messages": [response], "iterations": current_iterations + 1}

    def tools_node(self, state: RagAgentState) -> Dict[str, Any]:
        """
        自定义工具执行节点：
        官方的 ToolNode 是黑盒，只返回字符串。我们自己实现这个节点，
        不仅执行检索工具，还能把原始的 Document 对象塞回 State 供前端展示引用来源。
        """
        logger.info("🔧 执行节点: tools_node")
        messages = state.get("messages", [])
        last_message = messages[-1]
        
        tool_messages = []
        all_retrieved_docs = state.get("documents", []) # 获取已有的文档
        
        # 遍历大模型发出的所有工具调用请求
        for tool_call in getattr(last_message, "tool_calls", []):
            if tool_call["name"] == "search_documents":
                query = tool_call["args"].get("query", "")
                logger.info(f"  -> 执行 search_documents，搜索关键词: {query}")
                try:
                    # 真正执行检索
                    docs = self.retriever.invoke(query)
                    
                    # 重点：把原始文档保存下来，以便 rag.py 能提取 sources
                    all_retrieved_docs.extend(docs)
                    
                    if not docs:
                        content = "未找到相关文档内容。"
                    else:
                        # 格式化给大模型看的内容
                        context = "\n\n---\n\n".join([
                            f"[来源文件: {d.metadata.get('filename', '未知')}]\n{d.page_content}" 
                            for d in docs
                        ])
                        content = f"找到了以下相关文档片段：\n\n{context}"
                except Exception as e:
                    logger.error(f"  -> 检索工具执行失败: {e}", exc_info=True)
                    content = f"检索失败: {str(e)}"
                    
                # 按照 OpenAI 的标准格式，把结果打包成 ToolMessage
                tool_messages.append(ToolMessage(
                    content=content, 
                    tool_call_id=tool_call["id"], 
                    name=tool_call["name"]
                ))
                
        # 返回时，不仅追加 messages，还更新 documents 字段
        return {"messages": tool_messages, "documents": all_retrieved_docs}


# ==========================================
# 3. Routers Definition
# ==========================================
def route_after_agent(state: RagAgentState) -> Literal["tools", "end"]:
    """
    条件边（Conditional Edge）：根据 Agent 的输出决定是去执行工具，还是结束对话。
    """
    # 死循环熔断机制
    if state.get("iterations", 0) >= 5:
        logger.warning("达到最大循环次数 (5)，强制退出防止死循环")
        return "end"

    messages = state.get("messages", [])
    if not messages:
        return "end"
        
    last_message = messages[-1]
    
    # 核心判断：如果大模型的最后一条回复里包含 tool_calls，说明它想用工具
    if getattr(last_message, "tool_calls", None):
        logger.info(f"🔀 路由判定: tools (大模型请求调用工具: {[t['name'] for t in last_message.tool_calls]})")
        return "tools"
        
    # 如果没有 tool_calls，说明大模型觉得信息足够了，直接回答了用户
    logger.info("🔀 路由判定: end (大模型已生成最终回答)")
    return "end"


# ==========================================
# 4. Graph Builder
# ==========================================
def build_rag_agent_graph(llm, retriever):
    """
    构建并编译标准 Agentic 执行图
    """
    # 实例化节点管理器
    agent_nodes = AgentNodes(llm=llm, retriever=retriever)
    
    workflow = StateGraph(RagAgentState)
    
    # 注册节点
    workflow.add_node("agent", agent_nodes.agent_node)
    workflow.add_node("tools", agent_nodes.tools_node)
    
    # 设定入口节点为 agent 大脑
    workflow.set_entry_point("agent")
    
    # 核心 Agent 循环回路
    # Agent 思考完后，经过条件判断
    workflow.add_conditional_edges(
        "agent",
        route_after_agent,
        {
            "tools": "tools", # 如果要用工具，走向 tools 节点
            "end": END,       # 如果不用工具，走向结束
        }
    )
    
    # 工具执行完后，必须回到 agent 节点，让大脑根据工具返回的结果继续思考
    workflow.add_edge("tools", "agent")

    # 编译图
    return workflow.compile()