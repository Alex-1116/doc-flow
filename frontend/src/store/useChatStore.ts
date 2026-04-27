import { create } from 'zustand';
import { Message } from '@/features/chat/types';
import { chatApi } from '@/api/chat';

export interface Session {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
  isMessagesLoaded?: boolean; // 新增标志位，记录该会话的历史消息是否已从后端拉取
}

interface ChatStore {
  // 会话状态
  sessions: Session[];
  activeSessionId: string | null;
  isLoadingSessions: boolean;
  
  // 动作
  fetchSessions: () => Promise<void>;
  fetchSessionMessages: (sessionId: string) => Promise<void>;
  setActiveSession: (id: string) => void;
  createNewSession: () => string;
  deleteSession: (id: string) => Promise<void>;
  
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
  // 会话状态
  sessions: [],
  activeSessionId: null as string | null,
  isLoadingSessions: false,

  fetchSessions: async () => {
    try {
      set({ isLoadingSessions: true });
      const apiSessions = await chatApi.getSessions();
      
      const newSessions: Session[] = apiSessions.map(s => ({
        id: s.id,
        title: s.title,
        updatedAt: new Date(s.updated_at).getTime(),
        messages: [],
        isMessagesLoaded: false
      }));

      set((state) => {
        // 提取本地存在但后端还没有的会话（例如刚才创建的、还未发送任何消息的新对话）
        const localOnlySessions = state.sessions.filter(
          local => !newSessions.some(api => api.id === local.id) && local.messages.length === 0
        );
        
        // 对于后端返回的会话，如果本地已经存在，保留本地的 messages 等状态，以防流式输出时被覆盖
        const apiMergedSessions = newSessions.map(apiSession => {
          const localSession = state.sessions.find(s => s.id === apiSession.id);
          if (localSession) {
            return {
              ...apiSession,
              messages: localSession.messages,
              isMessagesLoaded: localSession.isMessagesLoaded
            };
          }
          return apiSession;
        });

        // 合并本地和后端的会话，并按时间倒序排序
        let finalSessions = [...localOnlySessions, ...apiMergedSessions];
        finalSessions.sort((a, b) => b.updatedAt - a.updatedAt);

        let nextActiveId = state.activeSessionId;

        if (finalSessions.length === 0) {
          const emptySession = { 
            id: generateSessionId(), 
            title: '新对话', 
            updatedAt: Date.now(), 
            messages: [], 
            isMessagesLoaded: true 
          };
          finalSessions = [emptySession];
          nextActiveId = emptySession.id;
        } else if (!nextActiveId) {
          // 如果有会话但没有 activeSessionId，优先找空的“新对话”激活，否则激活第一个
          const emptySession = finalSessions.find(s => s.title === '新对话' && s.messages.length === 0);
          nextActiveId = emptySession ? emptySession.id : finalSessions[0].id;
        }

        return { 
          sessions: finalSessions,
          activeSessionId: nextActiveId,
          isLoadingSessions: false
        };
      });

      // 触发拉取当前激活会话的消息
      const { activeSessionId, fetchSessionMessages } = get();
      if (activeSessionId) {
        await fetchSessionMessages(activeSessionId);
      }
    } catch (error) {
      console.error('获取会话列表失败:', error);
      set({ isLoadingSessions: false });
    }
  },

  fetchSessionMessages: async (sessionId: string) => {
    const session = get().sessions.find(s => s.id === sessionId);
    // 如果已经加载过，或者这是一个尚未同步到后端的全新对话，直接跳过
    if (!session || session.isMessagesLoaded) return;

    try {
      const apiMessages = await chatApi.getSessionMessages(sessionId);
      const messages: Message[] = apiMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        // 由于后端没有存 status/steps，从历史加载的都当做普通消息显示
        status: m.role === 'assistant' ? 'done' : undefined,
      }));

      set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === sessionId 
            ? { ...s, messages, isMessagesLoaded: true } 
            : s
        )
      }));
    } catch (error) {
      console.error(`获取会话 ${sessionId} 消息失败:`, error);
    }
  },

  setActiveSession: (id: string) => {
    set({ activeSessionId: id });
    // 切换会话时，异步拉取该会话的消息
    get().fetchSessionMessages(id);
  },
  
  createNewSession: () => {
    let createdId = '';
    set((state) => {
      // 检查是否已经存在一个空的“新对话”
      const existingEmptySession = state.sessions.find(
        s => s.title === '新对话' && s.messages.length === 0
      );

      // 如果已经有空的“新对话”，直接激活它，不再重复创建
      if (existingEmptySession) {
        createdId = existingEmptySession.id;
        return { activeSessionId: existingEmptySession.id };
      }

      // 否则创建新的空对话
      const newSession = { id: generateSessionId(), title: '新对话', updatedAt: Date.now(), messages: [], isMessagesLoaded: true };
      createdId = newSession.id;
      return {
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
      };
    });
    return createdId;
  },
  
  deleteSession: async (id: string) => {
    // 乐观更新：先在前端移除
    set((state) => {
      const newSessions = state.sessions.filter(s => s.id !== id);
      
      // 如果删除后没有会话了，自动创建一个新的空会话
      if (newSessions.length === 0) {
        const emptySession = { id: generateSessionId(), title: '新对话', updatedAt: Date.now(), messages: [], isMessagesLoaded: true };
        return {
          sessions: [emptySession],
          activeSessionId: emptySession.id
        };
      }
      
      return {
        sessions: newSessions,
        activeSessionId: state.activeSessionId === id ? (newSessions[0]?.id || null) : state.activeSessionId
      };
    });

    // 触发后端删除
    try {
      await chatApi.deleteSession(id);
    } catch (error) {
      console.error(`删除会话 ${id} 失败:`, error);
      // 真实场景下这里可以做回滚，目前简单输出日志
    }
  },

  addMessage: (message: Message) => set((state) => {
    const activeId = state.activeSessionId || state.sessions[0]?.id;
    return {
      sessions: state.sessions.map(s => {
        if (s.id === activeId) {
          // 如果是第一条用户消息，用作标题
          const title = (s.messages.length === 0 && message.role === 'user') 
            ? (message.content.length > 15 ? message.content.slice(0, 15) + '...' : message.content)
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

export const useActiveSession = () => useChatStore((state) => {
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
  return activeSession || state.sessions[0];
});

export const useActiveMessages = () => {
  const session = useActiveSession();
  return session ? session.messages : [];
};
