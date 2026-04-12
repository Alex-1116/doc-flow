import { create } from 'zustand';

export interface Document {
  id: string;
  name: string;
  chunks: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ content: string; metadata: Record<string, string> }>;
}

interface ChatStore {
  // 文档状态
  documents: Document[];
  addDocument: (doc: Document) => void;
  clearDocuments: () => void;
  
  // 聊天状态
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  
  // 界面状态
  activeTab: 'upload' | 'chat';
  setActiveTab: (tab: 'upload' | 'chat') => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // 文档状态
  documents: [],
  addDocument: (doc: Document) => set((state) => ({ documents: [...state.documents, doc] })),
  clearDocuments: () => set({ documents: [] }),
  
  // 聊天状态
  messages: [],
  addMessage: (message: Message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  
  // 界面状态
  activeTab: 'upload',
  setActiveTab: (tab: 'upload' | 'chat') => set({ activeTab: tab }),
}));