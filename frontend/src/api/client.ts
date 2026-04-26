import axios, { AxiosError } from 'axios';
import { API_URL, REQUEST_TIMEOUT } from '@/config/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 (Request Interceptor)
apiClient.interceptors.request.use(
  (config) => {
    // 预留：统一添加鉴权 Token
    // const token = localStorage.getItem('token'); // 或从 zustand store 中获取
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 (Response Interceptor)
apiClient.interceptors.response.use(
  (response) => {
    // 预留：统一处理后端的业务自定义状态码 (如 response.data.code !== 0)
    // if (response.data && response.data.code !== 0) {
    //   // 抛出业务异常
    //   return Promise.reject(new Error(response.data.message || '业务异常'));
    // }
    return response;
  },
  (error: AxiosError) => {
    // 统一处理 HTTP 状态码异常
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          console.error('鉴权失败 (401)，请重新登录');
          // 预留：清理 token 并跳转登录页
          break;
        case 403:
          console.error('拒绝访问 (403)：权限不足');
          break;
        case 404:
          console.error('请求的资源不存在 (404)');
          break;
        case 500:
          console.error('服务器内部错误 (500)');
          break;
        default:
          console.error(`请求错误: ${status}`, data);
      }
    } else if (error.request) {
      console.error('网络错误或请求超时', error.message);
    } else {
      console.error('请求配置错误', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;