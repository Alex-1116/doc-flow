import { useEffect, useRef } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { ChatMessageItem } from './chat-message-item';
import { Message } from '../types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessageListProps {
  messages: Message[];
  isGenerating: boolean;
}

export function ChatMessageList({ messages, isGenerating }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 使用 requestAnimationFrame 确保在 DOM 渲染后执行滚动
    requestAnimationFrame(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
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
    <ScrollArea className="h-full w-full [&_[data-slot=scroll-area-scrollbar]]:opacity-0 [&_[data-slot=scroll-area-scrollbar]]:transition-opacity [&_[data-slot=scroll-area-scrollbar]]:duration-300 hover:[&_[data-slot=scroll-area-scrollbar]]:opacity-100">
      <div id="chat-scroll-container" className="flex flex-col gap-6 p-6">
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}
        {/* 锚点元素，用于自动滚动到底部 */}
        <div ref={bottomRef} className="h-px w-full" />
      </div>
    </ScrollArea>
  );
}
