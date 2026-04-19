import { useEffect, useRef } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { ChatMessageItem } from './chat-message-item';
import { Message } from '../types';

interface ChatMessageListProps {
  messages: Message[];
  isGenerating: boolean;
}

export function ChatMessageList({ messages, isGenerating }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  if (messages.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground overflow-y-auto">
          <div className="mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <Bot className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-medium text-foreground shrink-0">知识库助手已就绪</h3>
          <p className="mt-2 max-w-md text-sm shrink-0">
            您可以询问任何关于已上传文档的问题。我会自动从文档中提取相关段落来回答您。
          </p>
        </div>
      );
    }

  return (
    <div ref={scrollRef} className="flex h-full flex-col gap-6 overflow-y-auto p-6 scrollbar-thin">
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
      
      {isGenerating && (
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              正在检索文档并生成回答...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
