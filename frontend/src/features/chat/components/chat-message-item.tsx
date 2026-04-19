import { Bot, FileText, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/libs/utils';
import { Message } from '../types';

interface ChatMessageItemProps {
  message: Message;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className="flex shrink-0 items-start">
        <Avatar className="h-10 w-10 border border-border shadow-sm">
          {isUser ? (
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </AvatarFallback>
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Bot className="h-6 w-6" />
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'relative rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-card text-foreground border border-border rounded-tl-sm'
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <div className="prose prose-slate max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-muted-foreground break-words">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-1 w-full max-w-2xl space-y-2 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              参考资料 ({message.sources.length})
            </div>
            <div className="grid gap-2">
              {message.sources.map((source, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted/50"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="truncate text-xs font-medium text-foreground">
                      {source.metadata.source || '未知文档'}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {source.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
