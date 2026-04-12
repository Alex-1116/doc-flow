# 📋 DocFlow 项目问题与 Bug 清单

> 更新时间: 2026-04-12
> 版本: v1.0

---

## 🎯 概览

| 严重级别 | 数量 | 状态 |
|---------|------|------|
| 🔴 P0 阻断 | 3 | 待修复 |
| 🟠 P1 严重 | 4 | 待修复 |
| 🟡 P2 一般 | 5 | 待修复 |
| 🔵 架构问题 | 4 | 待优化 |
| **总计** | **16** | |

---

## 🔴 P0 严重 Bug (阻断核心功能)

### B001: RAG 引擎初始化竞态条件
**位置**: `backend/app/rag.py:13-39`

**问题描述**:
- `RAGEngine.__init__()` 在构造时立即建立 ChromaDB 连接
- 无重试机制，连接失败直接抛出异常崩溃
- Docker 环境中 100% 复现

**影响**:
- ❌ 后端服务启动时必然崩溃
- ❌ Docker 容器无限重启
- ❌ 整个服务不可用

**复现步骤**:
```bash
docker compose up -d
# 10秒后观察
docker compose ps
# docflow-backend → Restarting
```

---

### B002: 模块级初始化死锁
**位置**: `backend/app/rag.py:110`

**问题描述**:
```python
# ❌ 模块导入时就执行初始化
rag_engine = RAGEngine()
```
- Python 导入模块层级执行初始化
- uvicorn 还没启动，服务就崩溃了
- 无法通过 FastAPI lifespan 优雅处理

**影响**:
- ❌ 服务启动流程完全失控
- ❌ 无法添加健康检查逻辑
- ❌ 无法实现延迟初始化

---

### B003: ChromaDB 集合不存在异常
**位置**: `backend/app/rag.py:101-107`

**问题描述**:
```python
collection = self.client.get_collection(settings.CHROMA_COLLECTION)
# 集合不存在直接抛出，外层无捕获
```

**影响**:
- ❌ 删除不存在的文档直接 500
- ❌ 空库启动首次操作必崩

---

## 🟠 P1 重要 Bug

### B004: ChromaDB 客户端/服务端版本不兼容
**位置**: `docker-compose.yml` + `requirements.txt`

**问题描述**:
- requirements.txt: `chromadb==0.4.24`
- docker-compose: `chromadb/chroma:latest` (当前 0.5.x)
- 0.5.x API 签名不兼容旧版客户端

**错误日志**:
```
ValueError: Could not connect to a Chroma server.
Are you sure it is running?
```

**影响**: ❌ 向量数据库完全无法连接

---

### B005: Ollama 模型可用性假检查
**位置**: `backend/main.py:47-53`

**问题描述**:
```python
# ❌ 只是返回配置字符串，没有实际连接检查
return HealthResponse(
    status="ok",
    ollama=settings.OLLAMA_BASE_URL,  # 只是个字符串！
    chromadb=f"{settings.CHROMA_HOST}:{settings.CHROMA_PORT}",  # 只是个字符串！
)
```

**影响**:
- ❌ 健康检查永远返回 "ok"
- ❌ 模型不存在也报告健康
- ❌ 运维无法监控真实状态

---

### B006: 上传文件异常时资源泄漏
**位置**: `backend/main.py:67-91`

**问题描述**:
```python
temp_path = save_uploaded_file(content, file.filename)
documents, doc_id, metadata = DocumentParser.parse(temp_path, file.filename)
# ↑ 这里抛出异常的话，下面的 cleanup 永远不执行
rag_engine.add_documents(documents, [metadata])
cleanup_file(temp_path)
```

**影响**:
- ⚠️ 解析失败的文件永远留在磁盘
- ⚠️ 时间长了磁盘爆满

---

### B007: 裸 except 吞掉所有异常
**位置**: 多处

**问题描述**:
```python
except Exception:  # ❌ 没有日志！
    return False
```

**影响**:
- ⚠️ 永远不知道为什么失败
- ⚠️ 排查问题像盲人摸象

---

## 🟡 P2 一般问题

### B008: Docker 启动顺序无保障
**位置**: `docker-compose.yml`

**问题描述**:
```yaml
depends_on:
  - ollama
  - chromadb
# ↑ 只检查容器是否 Running，不检查服务就绪
```

**影响**:
- ⚠️ 90% 概率后端启动时数据库还没 ready
- ⚠️ 用户必须手工等几分钟再重启后端

---

### B009: 前端硬编码后端地址
**位置**: `frontend/src/components/FileUpload.tsx:6`

**问题描述**:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```

**影响**:
- ⚠️ 生产部署必须重新构建
- ⚠️ 不支持动态配置反向代理

---

### B010: LangChain 废弃导入路径
**位置**: `backend/app/rag.py:3-8`

**问题描述**:
- LangChain 0.2.x 改了包结构
- 旧路径 `from langchain.chains import RetrievalQA` 已废弃

**影响**:
- ⚠️ 依赖版本升级直接崩溃
- ⚠️ 技术债越积越重

---

### B011: 缺少连接重试机制
**位置**: `backend/app/rag.py:13-26`

**问题描述**:
- 连接失败就是终局，没有重试
- 没有指数退避策略

**影响**:
- ⚠️ 临时网络波动永久瘫痪
- ⚠️ 微服务环境下极不可靠

---

### B012: 向量添加失败无回滚
**位置**: `backend/app/rag.py:48-57`

**问题描述**:
- 批量添加向量中途失败无事务
- 部分成功部分失败

**影响**:
- ⚠️ 数据不一致
- ⚠️ 重复向量污染检索结果

---

## 🔵 架构设计问题

### A001: 单例初始化时机错误
**风险等级**: 高

**反模式**:
```python
# 模块导入 = 建立连接 = 可能崩溃
rag_engine = RAGEngine()
```

**正确模式**:
- 首次访问 lazy 初始化
- FastAPI lifespan 中初始化

---

### A002: 无降级策略
**风险等级**: 中

**问题**:
- Ollama 挂了 = 全挂
- ChromaDB 挂了 = 全挂
- 没有降级 fallback

---

### A003: 缺少请求超时
**风险等级**: 中

**问题**:
- 大文档向量嵌入可能耗时几分钟
- 用户界面永远转圈
- 没有进度反馈

---

### A004: 无并发控制
**风险等级**: 中

**问题**:
- 同时上传多个大文档
- Ollama GPU 内存溢出
- ChromaDB 写入冲突

---

## 📊 Bug 热力图

| 模块 | Bug 数量 |
|------|---------|
| RAG 引擎 | 6 |
| Docker 编排 | 2 |
| API 接口 | 2 |
| 前端 | 1 |
| 文档解析 | 1 |

---

## 🎯 修复优先级建议

### 第一小时修复:
1. ✅ B004: ChromaDB 版本锁定 (已修复)
2. B001 + B002: 延迟初始化 + 重试机制

### 第二小时修复:
3. B005: 真实健康检查
4. B006: 资源泄漏
5. B008: 健康检查依赖

### 计划优化:
6. 架构问题 A001-A004

---

## 💡 关键洞察

**80% 的问题来自 20% 的根因**:

1. **模块级初始化反模式** → 导致所有分布式系统问题
2. **没有重试机制** → 分布式环境必然失败

这是典型的单体思维写分布式系统代码！
