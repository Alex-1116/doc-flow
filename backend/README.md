# DocFlow Backend

DocFlow 后端服务基于 Python 3.11+ 和 FastAPI 框架构建，集成了 LangChain 和 ChromaDB 以实现 RAG（检索增强生成）与多智能体（Multi-Agent）对话能力，并使用 SQLite 存储持久化业务数据。

## 📂 目录结构说明

```text
backend/
├── app/                    # 应用核心代码目录
│   ├── main.py             # 🚀 FastAPI 应用全局启动入口
│   │
│   ├── api/                # FastAPI 路由层 (Controllers)
│   │   ├── deps.py         # 依赖注入 (数据库 Session, 当前用户等)
│   │   └── v1/
│   │       ├── api.py      # v1 版本路由总入口
│   │       └── endpoints/  # 具体业务路由分组 (auth, user, query, documents 等)
│   │
│   ├── core/               # 核心引擎、环境配置与底层封装
│   │   ├── agents/         # 基于 LangGraph 的多智能体工作流架构
│   │   ├── providers/      # 外部模型服务提供商抽象层 (LLM, Embeddings)
│   │   ├── config.py       # 基于 Pydantic Settings 的全局环境变量管理
│   │   ├── logger.py       # 全局统一日志配置
│   │   ├── rag.py          # RAG 检索逻辑底层封装
│   │   ├── security.py     # 密码哈希(bcrypt)与 JWT 认证配置
│   │   └── vector_store.py # ChromaDB 向量数据库交互封装
│   │
│   ├── db/                 # 关系型数据库层 (SQLAlchemy)
│   │   ├── crud/           # 数据库增删改查操作
│   │   ├── models/         # SQLAlchemy 数据库表模型 (ORM)
│   │   └── database.py     # 异步 SQLite 引擎与会话工厂配置
│   │
│   ├── schemas/            # 接口数据校验层 (Pydantic Models)
│   │   ├── document.py     # 文档相关接口校验模型
│   │   ├── health.py       # 健康检查接口模型
│   │   └── query.py        # 问答与对话相关接口模型
│   │
│   ├── services/           # 核心业务逻辑层 (Services)
│   │   ├── chat_service.py # 基础对话逻辑封装
│   │   ├── chat_stream_service.py # 流式对话输出逻辑处理
│   │   ├── document_service.py    # 文档生命周期处理
│   │   └── parsers.py      # 文档解析器 (PDF, Word 等)
│   │
│   └── utils/              # 通用辅助工具类
│       ├── common.py       # UUID生成、时间格式化、随机字符串等工具
│       ├── file.py         # 文件读写与路径处理工具
│       └── jwt.py          # JWT Token 签发与解码工具
│
├── requirements.txt        # Python 核心依赖包列表
├── package-lock.json       # （部分工具链或格式化依赖）
└── Dockerfile              # Docker 镜像构建配置
```

## 🏗️ 架构规范与开发约定

1. **路由与业务分离 (`api/` vs `services/`)**: `api/` 下的文件仅负责接收 HTTP 请求、调用校验模型和路由转发，禁止在此处编写重度的业务逻辑或长耗时计算。核心业务均下沉至 `services/` 目录。
2. **数据模型解耦 (`db/models/` vs `schemas/`)**:
   - `db/models/`: **仅**用于定义 SQLAlchemy 的 ORM 数据库表结构。
   - `schemas/`: **仅**用于定义 Pydantic 的数据校验模型，规范 HTTP 请求体与响应体。绝不混用以防循环依赖或命名歧义。
3. **异步优先 (Async First)**: 所有 FastAPI 路由均使用 `async def` 定义。涉及 I/O 阻塞（如调用外部 LLM API 或数据库查询）时，务必使用异步客户端或异步 ORM（如 `aiosqlite`）以防阻塞主线程。
4. **配置解耦 (`core/config.py`)**: 禁止在代码中硬编码任何密钥或域名，统一从 `app.core.config.settings` 中读取。环境变量通过 `.env` 文件注入。

## 🚀 本地启动指引

1. 确保环境：Python 3.11+
2. 安装依赖：`pip install -r requirements.txt`
3. 配置环境：请参考根目录的 `.env.example` 配置 `.env` 文件。
4. 启动服务：`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` (确保在 backend 目录下执行)
