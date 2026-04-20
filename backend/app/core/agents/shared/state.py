from typing import List, Dict, Any, Annotated
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langchain_core.documents import Document
from langgraph.graph.message import add_messages

class BaseAgentState(TypedDict):
    """
    所有 Agent 共享的基础状态结构
    包含对话历史和迭代次数控制
    """
    messages: Annotated[List[BaseMessage], add_messages]
    iterations: int  # 循环控制：记录执行步数
    
class GlobalState(BaseAgentState):
    """
    全局主管 (Supervisor) 维护的总状态
    除了基础状态外，还可以包含跨 Agent 共享的数据
    """
    documents: List[Document]  # 检索到的全局文档池
    k: int                     # 检索配置参数
