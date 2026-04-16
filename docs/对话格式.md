# 对话格式

## 用途

本文件用于记录当前项目实际会接触到的模型对话协议，方便后端接入、健康检查和联调排错。

当前项目相关的协议主要有两类：

- `OpenAI Chat Completions`：用于 `LLM` 对话生成
- `Gemini Embedding`：用于文档向量化

## 1. OpenAI Chat Completions

### 端点

```http
POST /v1/chat/completions
```

### 鉴权

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

### 最小请求体

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ]
}
```

### 当前项目常用字段

| 字段 | 是否必需 | 说明 |
|------|----------|------|
| `model` | 是 | 模型名 |
| `messages` | 是 | 对话消息数组 |
| `temperature` | 否 | 采样温度 |
| `max_completion_tokens` | 否 | 最大输出 token 数 |
| `stream` | 否 | 是否流式输出 |
| `tools` | 否 | 工具调用定义 |
| `tool_choice` | 否 | 工具调用策略 |
| `response_format` | 否 | 结构化输出格式 |

### `messages` 支持的常见角色

| role | 说明 |
|------|------|
| `developer` | 开发者指令，优先级高 |
| `system` | 系统提示词，旧式兼容写法 |
| `user` | 用户输入 |
| `assistant` | 模型输出 |
| `tool` | 工具返回结果 |

### 简单响应示例

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好，我可以帮你分析文档。"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 12,
    "total_tokens": 22
  }
}
```

## 2. Gemini Embedding

### 用途

用于把文档切片和用户问题转换为向量，供 `ChromaDB` 做相似度检索。

### 当前平台提供的信息

服务商给出的模型信息如下：

- 模型：`gemini-embedding-001`
- Gemini 端点：`/v1beta/models/gemini-embedding-001:embedContent`
- OpenAI 兼容端点参考：`/v1/chat/completions`

### 说明

这意味着：

- `LLM` 可以按 OpenAI 对话格式调用
- `Embedding` 不能简单等同于标准 `POST /v1/embeddings`
- 接入时需要按平台实际支持的 Gemini 路径单独适配

### 当前项目的配置项

```env
LLM_PROVIDER=openai_compatible
EMBEDDING_PROVIDER=gemini

LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=

EMBEDDING_BASE_URL=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_PATH=/v1beta/models/gemini-embedding-001:embedContent
```

## 3. 当前项目实际使用范围

当前仓库只需要关心下面这些协议能力：

- OpenAI 风格的 `chat/completions`
- Gemini 风格的 Embedding 请求
- 基础鉴权头和 JSON 请求体
- 健康检查时的最小探活请求

以下能力目前不是本项目的核心依赖，可在真正用到时再补充：

- 图像输入
- 音频输入/输出
- 文件输入
- `tools` / 函数调用的完整高级参数
- `logprobs`
- `web_search_options`
- 多模态输出

## 4. 联调建议

当对接新服务商时，至少确认以下 4 点：

1. `LLM` 是否支持 `POST /v1/chat/completions`
2. `Embedding` 是否支持标准 `/v1/embeddings`，还是必须走专用路径
3. 服务端容器直连是否会被风控、Cloudflare 或白名单策略拦截
4. 返回值里哪个字段是真正的向量数组

## 5. 备注

如果后续服务商文档更明确，优先以服务商的正式接口说明为准，并同步更新本文件。
