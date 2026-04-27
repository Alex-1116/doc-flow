import apiClient from './client';
import { API_URL } from '@/config/api';
import { Message } from '@/features/chat/types';
import { Session } from '@/store/useChatStore';

export interface ChatSessionResponse {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageResponse {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const chatApi = {
  // 获取会话列表
  getSessions: async (): Promise<ChatSessionResponse[]> => {
    const response = await apiClient.get<ChatSessionResponse[]>(`${API_URL}/api/v1/chat/sessions`);
    return response.data;
  },

  // 获取单个会话信息
  getSession: async (sessionId: string): Promise<ChatSessionResponse> => {
    const response = await apiClient.get<ChatSessionResponse>(`${API_URL}/api/v1/chat/sessions/${sessionId}`);
    return response.data;
  },

  // 删除会话
  deleteSession: async (sessionId: string): Promise<ChatSessionResponse> => {
    const response = await apiClient.delete<ChatSessionResponse>(`${API_URL}/api/v1/chat/sessions/${sessionId}`);
    return response.data;
  },

  // 获取会话的历史消息
  getSessionMessages: async (sessionId: string): Promise<ChatMessageResponse[]> => {
    const response = await apiClient.get<ChatMessageResponse[]>(`${API_URL}/api/v1/chat/sessions/${sessionId}/messages`);
    return response.data;
  }
};
