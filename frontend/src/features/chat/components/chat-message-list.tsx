import { RefObject } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message } from '../types';
import { ChatMessageItem } from './chat-message-item';

interface ChatMessageListProps {
  messages: Message[];
  loading: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function ChatMessageList({ messages, loading, messagesEndRef }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">开始与文档对话</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          上传文档后，您可以向我询问任何关于文档内容的问题
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ScrollArea className="flex-1 px-6">
        <div className="space-y-6 flex flex-col py-6">
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}
        
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-5 py-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      </ScrollArea>
    </div>
  );
}
