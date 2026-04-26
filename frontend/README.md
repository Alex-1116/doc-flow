# DocFlow 前端项目 (Frontend)

本项目是 DocFlow (智能文档摘要与问答系统) 的前端部分，基于 **React 18** + **TypeScript** + **Vite** 构建，采用了现代化和模块化的架构设计。

## 🛠 技术栈

- **核心框架**: React 18, TypeScript, Vite
- **状态管理**: Zustand
- **路由管理**: React Router v6
- **UI 组件库**: Tailwind CSS, shadcn-ui, Radix UI
- **网络请求**: Fetch API (或 Axios), SSE (流式输出处理)
- **图标与动画**: Lucide React, Framer Motion (可选)

## 📁 目录结构说明

前端代码采用了类似 **Feature-Sliced Design (FSD)** 的模块化划分思想，将业务逻辑与通用 UI 解耦。

```text
src/
├── api/                  # 🌐 统一的 API 请求封装层
│   ├── client.ts         # 基础请求客户端封装
│   └── document.ts       # 文档及聊天相关的 API 方法
│
├── components/           # 🧩 全局通用/无状态 UI 组件
│   ├── blocks/           # 复杂的区块级组件
│   └── ui/               # 基础 UI 组件库 (shadcn-ui 生成，如 button, input 等)
│
├── config/               # ⚙️ 全局配置项
│   └── api.ts            # API_URL 及端点路由映射配置
│
├── features/             # 🚀 核心业务功能模块 (按功能聚合)
│   ├── chat/             # 对话功能模块 (包含其专属的组件、Hooks 等)
│   ├── document/         # 文档管理功能模块 (如文件上传等)
│   └── theme/            # 主题切换模块
│
├── layouts/              # 🏗️ 页面布局组件
│   ├── header/           # 顶部导航栏
│   └── main-layout.tsx   # 主体布局壳子
│
├── libs/                 # 🛠️ 通用工具函数库
│   └── utils.ts          # 常用工具 (如 Tailwind 的 cn 函数等)
│
├── pages/                # 📄 页面级组件 (路由的直接承载者)
│   ├── documents/        # 文档库页面
│   ├── home.tsx          # 首页 (聊天主界面)
│   ├── landing.tsx       # 落地页/引导页
│   └── not-found/        # 404 页面
│
├── router/               # 🗺️ 路由配置文件
│   └── index.tsx         # 路由树定义
│
├── store/                # 📦 Zustand 全局状态管理
│   ├── useChatStore.ts   # 聊天上下文状态
│   └── useThemeStore.ts  # 主题状态
│
├── types/                # 🏷️ 全局 TypeScript 类型声明
├── App.tsx               # 根组件
└── main.tsx              # 应用入口挂载点
```

## 📐 架构设计理念

1. **功能模块化 (`features/`)**
   我们将复杂的业务逻辑按功能域（Domain）拆分到了 `features/` 目录下。例如 `chat/` 模块下内聚了聊天面板、打字机 Hooks、侧边栏逻辑等，避免把所有东西都塞进全局的 `components/` 或 `pages/` 中。

2. **状态管理分离 (`store/`)**
   使用 `Zustand` 处理跨组件的全局状态（如主题切换、当前会话管理等），而组件内部的临时状态（如动画、定时器）则通过自定义 Hooks（如 `useSessionTypewriter`）在组件层级消化。

3. **UI 纯粹性 (`components/ui/`)**
   全局的 `components/ui/` 目录只存放 **纯 UI 组件**（即 shadcn-ui 生成的无业务状态组件）。**请勿在这些组件中直接编写业务逻辑。** *(特殊情况：修复底层兼容性 bug 除外)*

4. **API 层解耦 (`api/` & `config/`)**
   所有与后端的通信统一由 `api/` 目录接管，端点路径统一在 `config/api.ts` 中维护。这种设计使得在 API 版本迭代（如升级到 `/api/v2`）时，只需修改一处配置即可全局生效。

## 🚀 开发命令

```bash
# 安装依赖
npm install
# 或 pnpm install / yarn

# 启动开发服务器
npm run dev

# 生产环境构建
npm run build

# 本地预览生产构建产物
npm run preview
```

## 📝 编码规范

- **文件命名**: 组件和模块文件统一使用 **小写+中划线** 命名（如 `chat-interface.tsx`, `use-chat-sidebar.ts`）。
- **语言约定**: 代码注释及开发者交流请使用 **中文**。
- **自定义 Hook**: 复杂的副作用（如定时器、DOM 监听等）请务必抽离为单独的 Hook（如 `useLayoutEffect` 的打字机逻辑），避免污染渲染组件。
