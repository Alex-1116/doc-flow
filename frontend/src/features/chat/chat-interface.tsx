import { useState, useRef, useEffect } from 'react';
import { documentApi, StreamChunk } from '@/api/document';
import { Message, Document, AgentStep } from './types';
import { ChatHeader } from './components/chat-header';
import { ChatMessageList } from './components/chat-message-list';
import { ChatInput } from './components/chat-input';
import { ChatMinimap } from './components/chat-minimap';
import { ChatSidebar } from './components/chat-sidebar';
import { cn } from '@/libs/utils';

import { useChatStore, useActiveSession, useActiveMessages } from '@/store/useChatStore';

interface ChatInterfaceProps {
  documents: Document[];
}

function mergeSteps(prevSteps: AgentStep[] | undefined, chunk: StreamChunk): AgentStep[] {
  const steps = prevSteps ? [...prevSteps] : [];

  // 如果当前状态是完成或正在生成答案，不再记录到思考步骤中
  if (chunk.status === 'done' || chunk.status === 'generating') {
    return steps;
  }

  // 查找是否已经存在相同 message 的步骤
  const existingIndex = steps.findIndex(s => s.message === chunk.message);

  if (existingIndex !== -1) {
    // 如果存在，并且 chunk 带来了新的 details，就更新这个步骤
    if (chunk.details && !steps[existingIndex].details) {
      steps[existingIndex] = { ...steps[existingIndex], details: chunk.details };
      return steps;
    }
    // 否则认为是重复数据，直接返回
    return steps;
  }

  // 如果不存在，添加新步骤
  return [...steps, { status: chunk.status, message: chunk.message, details: chunk.details }];
}

export default function ChatInterface({ documents }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 使用全局状态管理对话和 Session
  const { addMessage, updateMessage, isSidebarPinned } = useChatStore();

  // 使用我们刚刚封装的“高级派生语法”，直接无脑拿到当前激活的会话和消息
  const activeSession = useActiveSession();
  const messages = useActiveMessages();
  const sessionId = activeSession?.id || '';

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    addMessage(userMessage);
    setInput('');
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      addMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'analyzing',
        loadingMessage: '正在分析查询...',
        steps: [],
      });

      const stream = documentApi.streamQuery(input, 4, sessionId);

      for await (const chunk of stream) {
        updateMessage(assistantId, (msg) => ({
          ...msg,
          status: chunk.status,
          loadingMessage: chunk.message,
          content: chunk.answer || msg.content,
          sources: chunk.sources || msg.sources,
          steps: mergeSteps(msg.steps, chunk),
        }));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || '处理您的问题时出现了错误';
      updateMessage(assistantId, (msg) => ({
        ...msg,
        content: `抱歉，${errorMessage}，请稍后重试。`,
        status: 'error',
        loadingMessage: undefined,
      }));
      console.error('查询错误:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 h-full w-full">
      {/* 侧边栏常驻区域（仅在大屏下根据状态显示） */}
      <div
        className={cn(
          "hidden md:block transition-all duration-300 overflow-hidden shrink-0",
          isSidebarPinned ? "w-72 opacity-100" : "w-0 opacity-0"
        )}
      >
        <div className="flex flex-col h-full w-72 bg-background md:rounded-2xl md:border md:border-border md:shadow-sm overflow-hidden">
          <div className="h-[60px] border-b border-border/50 flex items-center px-4 shrink-0 bg-transparent">
            <h2 className="font-semibold text-sm">会话历史</h2>
          </div>
          <div className="flex-1 overflow-hidden bg-transparent">
            <ChatSidebar />
          </div>
        </div>
      </div>


      {/* 右侧主聊天区域 */}
      <div className="flex flex-col h-full w-full bg-background md:rounded-2xl md:border md:border-border md:shadow-sm overflow-hidden">
        <ChatHeader documents={documents} />
        <div className="flex-1 bg-background/90 overflow-hidden">
          <ChatMessageList
            messages={messages}
            isGenerating={loading}
          />
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          disabled={documents.length === 0 || loading}
          placeholder={
            documents.length === 0
              ? '请先上传文档，再开始对话...'
              : '输入您的问题，基于已选知识库提问...'
          }
        />
        {/* 右侧缩略图标尺线 */}
        <ChatMinimap messages={messages} />
      </div>
    </div>
  );
}
