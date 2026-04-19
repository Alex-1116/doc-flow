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
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  
  // 聊天状态
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // 文档状态
  documents: [],
  setDocuments: (docs: Document[]) => set({ documents: docs }),
  addDocument: (doc: Document) => set((state) => ({ documents: [...state.documents, doc] })),
  removeDocument: (id: string) => set((state) => ({ documents: state.documents.filter(d => d.id !== id) })),
  clearDocuments: () => set({ documents: [] }),
  
  // 聊天状态
  messages: [],
  addMessage: (message: Message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
}));
