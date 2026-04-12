# 📋 DocFlow 项目问题与 Bug 清单

## 阻断核心功能
B01: RAG 引擎初始化竞态条件
问题描述:
- `RAGEngine.__init__()` 在构造时立即建立 ChromaDB 连接
- 无重试机制，连接失败直接抛出异常崩溃
- Docker 环境中 100% 复现
影响:
- 后端服务启动时必然崩溃
- Docker 容器无限重启
- 整个服务不可用
复现步骤:
```bash
docker compose up -d
# 10秒后观察
docker compose ps
# docflow-backend → Restarting
```

B02: 模块级初始化死锁
问题描述:
```python
# 模块导入时就执行初始化
rag_engine = RAGEngine()
```
- Python 导入模块层级执行初始化
- uvicorn 还没启动，服务就崩溃了
- 无法通过 FastAPI lifespan 优雅处理
影响:
- 服务启动流程完全失控
- 无法添加健康检查逻辑
- 无法实现延迟初始化

B03: ChromaDB 集合不存在异常
问题描述:
```python
collection = self.client.get_collection(settings.CHROMA_COLLECTION)
# 集合不存在直接抛出，外层无捕获
```
影响:
- 删除不存在的文档直接 500
- 空库启动首次操作必崩

B04: ChromaDB 客户端/服务端版本不兼容
问题描述:
- requirements.txt: `chromadb==0.4.24`
- docker-compose: `chromadb/chroma:latest` (当前 0.5.x)
- 0.5.x API 签名不兼容旧版客户端
错误日志:
```
ValueError: Could not connect to a Chroma server.
Are you sure it is running?
```
影响: 向量数据库完全无法连接

B05: Ollama 模型可用性假检查
问题描述:
```python
# 只是返回配置字符串，没有实际连接检查
return HealthResponse(
    status="ok",
    ollama=settings.OLLAMA_BASE_URL,  # 只是个字符串！
    chromadb=f"{settings.CHROMA_HOST}:{settings.CHROMA_PORT}",  # 只是个字符串！
)
```
影响:
- 健康检查永远返回 "ok"
- 模型不存在也报告健康
- 运维无法监控真实状态

B06: 上传文件异常时资源泄漏
问题描述:
```python
temp_path = save_uploaded_file(content, file.filename)
documents, doc_id, metadata = DocumentParser.parse(temp_path, file.filename)
# ↑ 这里抛出异常的话，下面的 cleanup 永远不执行
rag_engine.add_documents(documents, [metadata])
cleanup_file(temp_path)
```
影响:
- 解析失败的文件永远留在磁盘
- 时间长了磁盘爆满

B07: 裸 except 吞掉所有异常
问题描述:
```python
except Exception:  # 没有日志！
    return False
```
影响:
- 永远不知道为什么失败
- 排查问题像盲人摸象

B08: Docker 启动顺序无保障
问题描述:
```yaml
depends_on:
  - ollama
  - chromadb
# ↑ 只检查容器是否 Running，不检查服务就绪
```
影响:
- 90% 概率后端启动时数据库还没 ready
- 用户必须手工等几分钟再重启后端

B09: 前端硬编码后端地址
问题描述:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```
影响:
- 生产部署必须重新构建
- 不支持动态配置反向代理

B10: LangChain 废弃导入路径
问题描述:
- LangChain 0.2.x 改了包结构
- 旧路径 `from langchain.chains import RetrievalQA` 已废弃
影响:
- 依赖版本升级直接崩溃
- 技术债越积越重

B11: 缺少连接重试机制
问题描述:
- 连接失败就是终局，没有重试
- 没有指数退避策略
影响:
- 临时网络波动永久瘫痪
- 微服务环境下极不可靠

B12: 向量添加失败无回滚
问题描述:
- 批量添加向量中途失败无事务
- 部分成功部分失败
影响:
- 数据不一致
- 重复向量污染检索结果


## 架构设计问题
A01: 单例初始化时机错误
反模式:
```python
# 模块导入 = 建立连接 = 可能崩溃
rag_engine = RAGEngine()
```
正确模式:
- 首次访问 lazy 初始化
- FastAPI lifespan 中初始化

A02: 无降级策略
问题*:
- Ollama 挂了 = 全挂
- ChromaDB 挂了 = 全挂
- 没有降级 fallback

A03: 缺少请求超时
问题:
- 大文档向量嵌入可能耗时几分钟
- 用户界面永远转圈
- 没有进度反馈

A04: 无并发控制
问题:
- 同时上传多个大文档
- Ollama GPU 内存溢出
- ChromaDB 写入冲突

A05: 上传文件失败
问题:
- 处理文件失败: unstructured package not found, please install it with `pip install unstructured`
- 接口报错500: (Internal Server Error) `/api/documents/upload `
