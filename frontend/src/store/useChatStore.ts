import { create } from 'zustand';
import { Message } from '@/features/chat/types';

export interface Document {
  id: string;
  name: string;
  chunks: number;
}

interface ChatStore {
  // 文档状态
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  
  // 聊天状态
  sessionId: string;
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updateFn: (msg: Message) => Message) => void;
  clearMessages: () => void;
  resetSession: () => void;
}

// - crypto 对象 ：这是现代浏览器提供的一个内置的、用于加密和生成强随机数的 Web API。
// - randomUUID() 方法 ：它会直接生成一个符合 RFC 4122 标准的 v4 UUID 字符串（例如： "36b8f84d-df4e-4d49-b662-bcde71a8764f" ）。
const generateSessionId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);

export const useChatStore = create<ChatStore>((set) => ({
  // 文档状态
  documents: [],
  setDocuments: (docs: Document[]) => set({ documents: docs }),
  addDocument: (doc: Document) => set((state) => ({ documents: [...state.documents, doc] })),
  removeDocument: (id: string) => set((state) => ({ documents: state.documents.filter(d => d.id !== id) })),
  clearDocuments: () => set({ documents: [] }),
  
  // 聊天状态
  sessionId: generateSessionId(),
  messages: [],
  addMessage: (message: Message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id: string, updateFn: (msg: Message) => Message) => 
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? updateFn(msg) : msg))
    })),
  clearMessages: () => set({ messages: [] }),
  resetSession: () => set({ sessionId: generateSessionId(), messages: [] }),
}));
