import apiClient from './client';
import { API_ENDPOINTS } from '@/config/api';
import { AgentStatus } from '@/features/chat/types';

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

export interface StreamChunk {
  status: AgentStatus;
  message: string;
  details?: string;
  answer?: string;
  sources?: Array<{ content: string; metadata: Record<string, string> }>;
}

export interface DocumentListItem {
  id: string;
  name: string;
  chunks: number;
}

export interface DocumentDetailResponse {
  id: string;
  name: string;
  file_type: string;
  chunks: number;
  content: string;
}

export const documentApi = {
  // 获取文档列表
  list: async (): Promise<{ documents: DocumentListItem[] }> => {
    const response = await apiClient.get<{ documents: DocumentListItem[] }>(
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
  query: async (question: string, k: number = 4, sessionId: string = "default_session"): Promise<QueryResponse> => {
    const response = await apiClient.post<QueryResponse>(
      API_ENDPOINTS.query,
      { question, k, session_id: sessionId }
    );
    return response.data;
  },

  // 流式查询文档
  streamQuery: async function* (question: string, k: number = 4, sessionId: string = "default_session"): AsyncGenerator<StreamChunk, void, unknown> {
    const streamUrl = API_ENDPOINTS.query.replace('/query', '/query_stream');
    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, k, session_id: sessionId }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`流式请求失败: ${response.statusText}`);
    }

    // 获取 ReadableStream 的读取器，用于后续按块读取数据
    const reader = response.body.getReader();
    // 使用 utf-8 解码器，用于将二进制流 (Uint8Array) 转换为文本
    const decoder = new TextDecoder('utf-8');
    // buffer 用于暂存因为被截断而无法在一次 read() 中被解析为完整 JSON 的字符串碎片
    let buffer = '';

    try {
      while (true) {
        // 等待接收下一个数据块，done 表示流是否结束，value 是包含新数据的 Uint8Array
        const { done, value } = await reader.read();
        if (done) break;

        // stream: true 保证了如果一个中文字符（通常占3个字节）在 chunk 边缘被切断，
        // TextDecoder 会把不完整的字节暂存在内部，下次 read 时拼上，不会产生乱码。
        buffer += decoder.decode(value, { stream: true });
        
        // 后端返回的是 ndjson (Newline Delimited JSON)，所以按换行符拆分
        const lines = buffer.split('\n');
        
        // pop() 会移除并返回数组的最后一个元素。
        // 如果数据块在 JSON 中间被截断，最后一个元素就是不完整的 JSON 字符串，
        // 把它放回 buffer 里，等待下一个数据块拼上。
        // 如果数据块刚好以 \n 结尾，最后一个元素就是空字符串 ''，放入 buffer 也没影响。
        buffer = lines.pop() || '';

        // 遍历能够完整解析的行
        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line) as StreamChunk;
              // 每次成功解析出一个数据块，就通过 yield 向上层抛出，驱动 UI 更新
              yield chunk;
            } catch (e) {
              console.error('Failed to parse chunk:', line, e);
            }
          }
        }
      }

      // 循环跳出后，处理流结束时剩余的数据
      // 传入 stream: false 告诉 decoder 流已结束，把缓存里所有剩下的字节强制吐出来
      buffer += decoder.decode(new Uint8Array(), { stream: false });
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer) as StreamChunk;
          yield chunk;
        } catch (e) {
          console.error('Failed to parse final chunk:', buffer, e);
        }
      }
    } finally {
      // 无论成功还是异常，确保释放读取器锁，防止内存泄漏
      reader.releaseLock();
    }
  },

  // 删除单个文档
  delete: async (docId: string): Promise<{ status: string; doc_id: string }> => {
    const response = await apiClient.delete<{ status: string; doc_id: string }>(
      `${API_ENDPOINTS.documents}/${docId}`
    );
    return response.data;
  },

  // 获取文档详情
  getDetail: async (docId: string): Promise<DocumentDetailResponse> => {
    const response = await apiClient.get<DocumentDetailResponse>(
      `${API_ENDPOINTS.documents}/${docId}`
    );
    return response.data;
  },
};
