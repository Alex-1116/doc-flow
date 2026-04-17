import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Message } from '../types';

interface ChatMessageItemProps {
  message: Message;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0 border bg-purple-600">
          <AvatarFallback className="bg-purple-600 text-white">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={`max-w-2xl rounded-2xl px-5 py-4 ${
          isUser
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {!isUser ? (
          <ReactMarkdown className="prose prose-sm max-w-none">
            {message.content}
          </ReactMarkdown>
        ) : (
          message.content
        )}
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">来源:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(message.sources.map((s) => s.metadata.filename || '未知文档')))
                .slice(0, 2)
                .map((filename, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal border-gray-300">
                  {filename}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0 border bg-gray-600">
          <AvatarFallback className="bg-gray-600 text-white">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
