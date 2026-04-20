# DocFlow 多智能体 (Multi-Agent) 核心引擎

本目录包含了 DocFlow 项目基于 **LangGraph** 构建的企业级多智能体协同引擎。
系统采用标准的 **Supervisor (主管分发) 模式**，将不同的业务场景解耦为独立的 Agent（子图），并通过主管 Agent 进行统一调度。

## 📂 目录架构

```text
backend/app/core/agents/
├── main.py                  # 🚀 全局入口，对外暴露 `get_docflow_agent()` 方法
├── shared/                  # 🤝 公共资源池
│   ├── __init__.py
│   └── state.py             # 定义所有 Agent 共享的基类状态 (BaseAgentState) 和全局状态 (GlobalState)
├── supervisor/              # 👨‍💼 主管部门 (Supervisor Agent)
│   ├── __init__.py
│   └── graph.py             # 负责接收用户输入，进行意图识别，并将任务路由给下游具体的业务 Agent
├── rag_agent/               # 🔍 检索部门 (RAG Agent)
│   ├── __init__.py
│   └── graph.py             # 核心问答执行图：分析 -> 检索 -> 生成，支持 Tool Calling 和防死循环熔断
└── summary_agent/           # 📝 总结部门 (Summary Agent)
    ├── __init__.py
    └── graph.py             # 负责长文档的摘要和结构化提取（开发中）
```

## 🔄 核心数据流转 (Workflow)

当用户在前端发起提问时，数据在后端的流转过程如下：

1. **入口 (rag.py)**: 将用户的问题包装为 `HumanMessage`，连同空的 `documents` 列表等初始状态传入 `main.py` 暴露的超级图（Super Graph）。
2. **主管节点 (Supervisor Node)**: 
   - 位于 `supervisor/graph.py`。
   - 读取对话历史，识别用户意图。
   - 若意图为“总结文档”，则将状态路由至 `summary_agent`。
   - 若意图为“提问/查阅资料”，则将状态路由至 `rag_agent`。
3. **子 Agent 执行**:
   - **RAG Agent**: 基于 Tool Calling 架构，大模型主动提取检索词 -> 触发自定义 Tool 节点查询 ChromaDB -> 将查到的 `Document` 对象存入状态 -> 带着上下文生成最终回答。
   - **Summary Agent**: 专门处理文档的 Map-Reduce 总结逻辑。
4. **结束 (END)**: 子 Agent 执行完毕后，最终生成的回答和文档引用列表（Sources）会沿原路返回给 API 接口。

## 🛠️ 如何添加一个新的 Agent？

随着业务的发展，如果你想添加一个新的智能体（例如：数据分析 Agent `data_agent`），只需遵循以下步骤：

1. **创建目录**: 在 `agents/` 下新建 `data_agent/` 目录。
2. **定义图 (Graph)**: 在 `data_agent/graph.py` 中定义该 Agent 专属的 `State`（继承自 `BaseAgentState`）、`Nodes` 和组装逻辑，并返回编译好的图（`return workflow.compile()`）。
3. **注册到主管**: 
   - 打开 `supervisor/graph.py`。
   - 将你的新 Agent 作为一个普通节点添加到超级图中：`super_graph.add_node("data_agent", data_agent_app)`。
   - 在主管节点的意图识别逻辑和条件边（`add_conditional_edges`）中，增加通向 `data_agent` 的路由判断。

## 🛡️ 工程规范与安全机制

- **单一事实来源 (Single Source of Truth)**: 所有的对话历史必须存储在 `state["messages"]` 列表中。避免使用散落的单独字符串字段（如 `question` 或 `answer`）来传递聊天记录。
- **状态追加机制**: 状态字典中的 `messages` 字段使用了 `Annotated[List[BaseMessage], add_messages]`，确保每次新产生的消息都是**追加 (Append)** 而不是覆盖。
- **死循环熔断**: 为了防止大模型在使用工具时陷入无限重试的死循环，每个 Agent 的路由节点都必须检查 `state["iterations"]`，超过阈值（如 5 次）必须强制返回 `END`。
- **SystemMessage 规范**: 为大模型设定的人设和行为准则必须包装在 `SystemMessage` 中，并置于 `messages` 列表的首位，严禁伪装成 `HumanMessage`。



### TODO：

1. 内存共享问题（MemorySaver 只是单机版）

- 现状 ：我们在 agents/main.py 里写了 _global_memory = MemorySaver() 。它是基于 Python 进程内存的。
- 未来的坑 ：如果未来你用 gunicorn 部署，开了 4 个 Worker（工作进程）。用户发第一句话落到了 Worker 1，发第二句话落到了 Worker 2，Worker 2 是拿不到 Worker 1 的内存记忆的，会导致系统偶尔“失忆”。
- 解法 ：当业务做大时，只需要把 MemorySaver() 换成 LangGraph 官方提供的 AsyncRedisSaver() ，把记忆存到 Redis 里，就瞬间支持分布式高并发了。
2. 滑动窗口切断了“工具对（Tool Pairs）”

- 现状 ：我们通过 invoke_messages[-10:] 粗暴地截取了最后 10 条消息。
- 未来的坑 ：大模型调用工具时，总是成对出现的（一条 AIMessage(tool_calls=[...]) 紧接着一条 ToolMessage ）。如果 -10 刚好切在了它俩中间（比如保留了 ToolMessage 但丢弃了发起请求的 AIMessage ），OpenAI/Gemini 的 API 会报错： “遇到没有调用源的工具回复” 。
- 解法 ：目前保留 10 条（5轮对话）足够宽裕，基本切不到当前的工具对。未来可以通过 LangChain 提供的 trim_messages 辅助函数来更安全地裁剪，它能识别并保持工具对的完整。


