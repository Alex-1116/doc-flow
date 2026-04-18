import apiClient from './client';
import { API_ENDPOINTS } from '@/config/api';

export interface DocumentResponse {
  doc_id: string;
  filename: string;
  chunks: number;
  status: string;
}

export interface QueryResponse {
  answer: string;
  sources: Array<{ content: string; metadata: Record<string, string> }>;
}

export const documentApi = {
  // 获取文档列表
  list: async (): Promise<{ documents: Array<{ id: string; name: string; chunks: number }> }> => {
    const response = await apiClient.get<{ documents: Array<{ id: string; name: string; chunks: number }> }>(
      API_ENDPOINTS.documents
    );
    return response.data;
  },

  // 上传文档
  upload: async (file: File): Promise<DocumentResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<DocumentResponse>(
      API_ENDPOINTS.upload,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // 查询文档
  query: async (question: string, k: number = 4): Promise<QueryResponse> => {
    const response = await apiClient.post<QueryResponse>(
      API_ENDPOINTS.query,
      { question, k }
    );
    return response.data;
  },

  // 删除单个文档
  delete: async (docId: string): Promise<{ status: string; doc_id: string }> => {
    const response = await apiClient.delete<{ status: string; doc_id: string }>(
      `${API_ENDPOINTS.documents}/${docId}`
    );
    return response.data;
  },
};