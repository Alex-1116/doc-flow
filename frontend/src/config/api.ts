// API 配置模块
// 支持运行时配置，通过 window 对象注入

declare global {
  interface Window {
    __DOCFLOW_API_URL__?: string;
  }
}

// 获取 API URL 的优先级:
// 1. 运行时注入 (window.__DOCFLOW_API_URL__)
// 2. 环境变量 (import.meta.env.VITE_API_URL)
// 3. 当前主机 (自动推断)
export const getApiUrl = (): string => {
  // 1. 检查运行时注入
  if (typeof window !== 'undefined' && window.__DOCFLOW_API_URL__) {
    return window.__DOCFLOW_API_URL__;
  }

  // 2. 检查环境变量
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 3. 自动推断 - 使用当前主机
  if (typeof window !== 'undefined') {
    // 在生产环境中，使用相对路径或当前主机
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    // 默认后端端口是 8080
    return `${protocol}//${host}:8080`;
  }

  // 4. 默认回退
  return 'http://localhost:8080';
};

// API 端点配置
export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
  health: `${API_URL}/api/health`,
  upload: `${API_URL}/api/documents/upload`,
  query: `${API_URL}/api/query`,
  documents: `${API_URL}/api/documents`,
} as const;

// 请求超时配置 (毫秒)
export const REQUEST_TIMEOUT = 300000; // 5分钟

// 重试配置
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
};
