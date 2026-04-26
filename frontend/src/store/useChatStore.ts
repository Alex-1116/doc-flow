import { create } from 'zustand';
import { Message } from '@/features/chat/types';

export interface Document {
  id: string;
  name: string;
  chunks: number;
}

export interface Session {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

interface ChatStore {
  // 文档状态
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  
  // 会话状态
  sessions: Session[];
  activeSessionId: string | null;
  
  // 动作
  setActiveSession: (id: string) => void;
  createNewSession: () => void;
  deleteSession: (id: string) => void;
  
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updateFn: (msg: Message) => Message) => void;
  clearMessages: () => void;
  
  // UI 状态
  isSidebarPinned: boolean;
  toggleSidebarPinned: () => void;
  setSidebarPinned: (pinned: boolean) => void;
}

// - crypto 对象 ：这是现代浏览器提供的一个内置的、用于加密和生成强随机数的 Web API。
// - randomUUID() 方法 ：它会直接生成一个符合 RFC 4122 标准的 v4 UUID 字符串（例如："36b8f84d-df4e-4d49-b662-bcde71a8764f" ）。
const generateSessionId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);

export const useChatStore = create<ChatStore>((set, get) => ({
  // 文档状态
  documents: [],
  setDocuments: (docs: Document[]) => set({ documents: docs }),
  addDocument: (doc: Document) => set((state) => ({ documents: [...state.documents, doc] })),
  removeDocument: (id: string) => set((state) => ({ documents: state.documents.filter(d => d.id !== id) })),
  clearDocuments: () => set({ documents: [] }),
  
  // 会话状态
  sessions: [
    { id: generateSessionId(), title: '今天的新对话', updatedAt: Date.now(), messages: [] },
    { id: generateSessionId(), title: '前天的问题探讨', updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, messages: [] },
    { id: generateSessionId(), title: '上周的系统架构设计', updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, messages: [] },
    { id: generateSessionId(), title: '关于项目重构的讨论', updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000, messages: [] },
    { id: generateSessionId(), title: '去年的老代码分析', updatedAt: Date.now() - 40 * 24 * 60 * 60 * 1000, messages: [] },
  ],
  activeSessionId: null as string | null,

  setActiveSession: (id: string) => set({ activeSessionId: id }),
  
  createNewSession: () => {
    set((state) => {
      // 检查是否已经存在一个空的“新对话”
      const existingEmptySession = state.sessions.find(
        s => s.title === '新对话' && s.messages.length === 0
      );

      // 如果已经有空的“新对话”，直接激活它，不再重复创建
      if (existingEmptySession) {
        return { activeSessionId: existingEmptySession.id };
      }

      // 否则创建新的空对话
      const newSession = { id: generateSessionId(), title: '新对话', updatedAt: Date.now(), messages: [] };
      return {
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
      };
    });
  },
  
  deleteSession: (id: string) => set((state) => {
    const newSessions = state.sessions.filter(s => s.id !== id);
    
    // 如果删除后没有会话了，自动创建一个新的空会话
    if (newSessions.length === 0) {
      const emptySession = { id: generateSessionId(), title: '新对话', updatedAt: Date.now(), messages: [] };
      return {
        sessions: [emptySession],
        activeSessionId: emptySession.id
      };
    }
    
    return {
      sessions: newSessions,
      activeSessionId: state.activeSessionId === id ? (newSessions[0]?.id || null) : state.activeSessionId
    };
  }),

  addMessage: (message: Message) => set((state) => {
    const activeId = state.activeSessionId || state.sessions[0]?.id;
    return {
      sessions: state.sessions.map(s => {
        if (s.id === activeId) {
          // 如果是第一条用户消息，用作标题
          const title = (s.messages.length === 0 && message.role === 'user') 
            ? message.content.slice(0, 15) + '...' 
            : s.title;
          return { ...s, title, updatedAt: Date.now(), messages: [...s.messages, message] };
        }
        return s;
      })
    };
  }),

  updateMessage: (id: string, updateFn: (msg: Message) => Message) => set((state) => {
    const activeId = state.activeSessionId || state.sessions[0]?.id;
    return {
      sessions: state.sessions.map(s => {
        if (s.id === activeId) {
          return {
            ...s,
            messages: s.messages.map(msg => msg.id === id ? updateFn(msg) : msg)
          };
        }
        return s;
      })
    };
  }),

  clearMessages: () => set((state) => {
    const activeId = state.activeSessionId || state.sessions[0]?.id;
    return {
      sessions: state.sessions.map(s => {
        if (s.id === activeId) {
          return { ...s, messages: [] };
        }
        return s;
      })
    };
  }),

  // UI 状态
  isSidebarPinned: false,
  toggleSidebarPinned: () => set((state) => ({ isSidebarPinned: !state.isSidebarPinned })),
  setSidebarPinned: (pinned: boolean) => set({ isSidebarPinned: pinned }),
}));

// ==========================================
// Zustand 官方推荐的高级派生语法 (Derived State Selectors)
// 将复杂逻辑封装在 Store 中，前端直接无脑调用，并且保证 100% 响应式
// ==========================================

export const useActiveSession = () => useChatStore((state) => 
  state.sessions.find(s => s.id === (state.activeSessionId || state.sessions[0]?.id))
);

export const useActiveMessages = () => {
  const session = useActiveSession();
  return session ? session.messages : [];
};
