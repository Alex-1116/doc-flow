import { useState, useRef, useEffect } from 'react';
import { documentApi } from '@/api/document';
import { Message, Document } from './types';
import { ChatHeader } from './components/chat-header';
import { ChatMessageList } from './components/chat-message-list';
import { ChatInput } from './components/chat-input';

interface ChatInterfaceProps {
  documents: Document[];
}

export default function ChatInterface({ documents }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await documentApi.query(input, 4);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || '处理您的问题时出现了错误';
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，${errorMessage}，请稍后重试。`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      console.error('查询错误:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
      <ChatHeader documents={documents} />
      <div className="flex-1 overflow-hidden">
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
