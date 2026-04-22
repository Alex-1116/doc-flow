import { useState, useRef, useEffect } from 'react';
import { documentApi, StreamChunk } from '@/api/document';
import { Message, Document, AgentStep } from './types';
import { ChatHeader } from './components/chat-header';
import { ChatMessageList } from './components/chat-message-list';
import { ChatInput } from './components/chat-input';

import { useChatStore } from '@/store/useChatStore';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 使用全局状态管理对话和 Session
  const { messages, sessionId, addMessage, updateMessage } = useChatStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="flex h-full w-full flex-col bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
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
    </div>
  );
}
