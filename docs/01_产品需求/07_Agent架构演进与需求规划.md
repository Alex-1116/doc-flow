# DocFlow Agent 架构演进与需求规划

## 一、 从 RAG 到 Agent 的愿景跨越

**当前的 DocFlow（被动 RAG 系统）：**
用户提问 -> 系统检索相关切片 -> LLM 总结回答。
*局限性*：只能做碎片化的事实检索，无法完成复杂的文档分析、对比和结构化提取任务。

**未来的 DocFlow Agent（主动执行智能体）：**
用户提出复杂需求（例如：“对比 V1 和 V2 PRD，提取所有新增的风险点并生成 Markdown 待办清单”） -> Agent 拆解任务 -> 自主调用多个工具（检索、对比、格式化） -> 输出最终结果。

---

## 二、 核心 Agent 需求规划（紧扣二期/三期演进）

### 1. 意图路由与多工具调度 (Router & Tool Use)
- **需求**：打破单一的“检索-回答”链路，让 LLM 成为决策大脑。
- **场景**：
  - 用户问闲聊问题，Agent 直接回答。
  - 用户要求总结全文，Agent 调用 `SummarizationTool`（基于 Map-Reduce）。
  - 用户要求查阅细节，Agent 调用 `DocumentSearchTool`（现有的 RAG 逻辑）。

### 2. 长文本深度分析 (Deep Research Agent)
- **需求**：解决 RAG 只能看“几页纸”的缺陷，赋予 Agent 通读长文的能力。
- **场景**：用户要求“提取会议纪要里的所有 Action Items”，Agent 会自主分页读取文档，持续累加提取结果，直至通读完毕。

### 3. 结构化输出与工作流 (Workflow Agent)
- **需求**：支持强类型、结构化的数据提取，而非总是返回一段自然语言。
- **场景**：强制 LLM 输出 JSON 格式的“风险清单”或“待办事项”，前端接收后渲染为可交互的 Checklist 或数据表格。

### 4. 会话记忆与上下文推理 (Memory-Aware Agent)
- **需求**：赋予 Agent 短期（Session）和长期记忆。
- **场景**：用户追问“刚才那个风险点的解决方案是什么？”，Agent 能够根据上下文记忆，自动构造新的检索词去 ChromaDB 中进行定向二次检索。

### 5. 精准引用溯源与范围控制 (Citation & Scope Control)
- **需求**：知识库 Agent 的核心是“不胡编乱造”（Hallucination-free），Agent 必须能够清晰地指出其生成的结论来源于哪篇文档的哪一页，并支持用户限定检索范围。
- **场景**：Agent 提取出 5 条待办事项，用户点击其中一条，UI 自动高亮对应的文档原文片段。同时，用户可以勾选“仅在文档A和文档B中查找”。

---

## 三、 架构设计与技术落地路径

当前的架构（FastAPI + LangChain + ChromaDB）非常适合平滑升级为 Agent 架构。

### 1. 后端引入 Agent 编排层 (LangGraph)
在 `backend/app/services` 中引入 **LangGraph**，将现有的直线逻辑改造为状态机驱动的循环决策网络：
- **State**：维护当前对话上下文、检索到的文档内容、提取的中间结果。
- **Nodes**：拆分出独立的执行节点（如 `Retrieve_Node`, `Summarize_Node`, `Extract_Node`）。
- **Edges**：根据 LLM 的意图分类，决定下一步走向哪个节点。

### 2. 工具库封装 (Tool Calling)
利用 OpenAI 兼容接口的 Tool Calling 能力，将现有功能包装为工具：
```python
@tool
def search_documents(query: str, doc_ids: List[str] = None) -> str:
    """当用户需要查找文档细节时调用此工具。"""
    # 现有的 ChromaDB 检索逻辑

@tool
def extract_action_items(doc_id: str) -> str:
    """当用户需要提取待办事项、会议决定时调用此工具。"""
    # 结构化提取逻辑
```

### 3. 前端交互升级 (Agentic UI)
前端需要从“聊天框”升级为“智能工作台”：
- **过程可视化**：增加类似 Claude 的“思考链（Thinking）”或“工具调用中”状态面板，让用户看到 Agent 正在做什么。
- **动态组件渲染**：根据后端返回的结构化数据，动态渲染 Table、Card 或 Checklist 组件。
- **快捷指令**：支持 `/summarize`（全文总结）、`/compare`（文档对比）等快捷命令，明确触发特定 Agent 流程。

### 4. 人机协同与工程约束 (Human-in-the-Loop & Constraints)
Agent 架构不同于单次 RAG 请求，它是一个循环系统（Loop），因此在架构设计时必须补充以下安全垫：
- **混合反馈 (Human-in-the-Loop)**：当 Agent 执行高敏感任务（如总结待办并“发送邮件”）时，必须在发送前暂停并请求用户确认。
- **死循环熔断**：为 LangGraph 设置 `max_iterations`，防止 Agent 在找不到答案时反复调用搜索工具。
- **Token 与成本控制**：由于 Agent 可能会发起多次查询，必须对 `Prompt Tokens` 和 `Completion Tokens` 建立严格的观测指标和硬性上限。

---

## 四、 演进路线建议 (Roadmap)

建议分三步稳扎稳打地实现 Agent 转型：

**第一步：工具化改造 (Tool Calling)**
- **目标**：重构现有的问答接口，引入 Function Calling。让 LLM 能够自主决定是“普通回答”还是“触发检索工具”。
- **价值**：打通 Agent 的基础设施，提升闲聊与问答的隔离度。

**第二步：特定任务 Agent 落地 (Task-Specific Agent)**
- **目标**：实现强需求的“结构化要点提取”或“全文总结”功能。
- **价值**：写一个专门的 Agent Prompt，让它能够自主读取文档元数据并迭代处理，交付一份完整的《风险与待办报告》。

**第三步：多智能体编排 (Multi-Agent with LangGraph)**
- **目标**：实现复杂任务的拆解与分发。
- **价值**：引入一个 Supervisor Agent（主管），它负责理解复杂的复合指令，并调度“检索 Agent”、“总结 Agent”和“对比 Agent”协同工作，最终汇总结果给用户。


```
backend/app/core/agents/
├── shared/                  # 公共资源库 (所有 Agent 共享)
│   ├── state.py             # 全局的 BaseState 定义
│   └── tools.py             # 通用工具 (如：查时间、发邮件)
│
├── rag_agent/               # 我们现在写的这个 Agent (知识库检索部门)
│   ├── graph.py             # RAG 专属的执行图
│   └── tools.py             # RAG 专属工具 (如：ChromaDB 检索)
│
├── summary_agent/           # 另一个 Agent (总结提炼部门)
│   ├── graph.py             # 总结专属的执行图 (Map-Reduce 逻辑)
│   └── tools.py             # 专属工具
│
├── supervisor/              # 主管 Agent (前台接待/分发任务)
│   └── graph.py             # 负责意图识别，把任务派发给不同的子 Agent
│
└── main.py                  # 整个系统的总入口
```
