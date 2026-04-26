import { Bot, FileText, User, Loader2, Sparkles, Search, AlertCircle, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/libs/utils';
import { Message, AgentStep } from '../types';
import { useState } from 'react';

interface ChatMessageItemProps {
  message: Message;
}

function StepIcon({ status, isCurrent }: { status: AgentStep['status'], isCurrent: boolean }) {
  if (!isCurrent) return <CheckCircle2 className="h-3.5 w-3.5 text-primary/70" />;
  
  switch (status) {
    case 'analyzing': return <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />;
    case 'retrieving': return <Search className="h-3.5 w-3.5 animate-pulse text-primary" />;
    case 'generating': return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    case 'error': return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    default: return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
  }
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user';
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const hasSteps = message.steps && message.steps.length > 0;
  const isGenerating = message.status === 'generating';

  return (
    // 当浏览器执行 scrollIntoView({ block: 'start' }) 时，它会读取目标元素身上的 scroll-margin 属性，并自动帮你保留出这段空隙
    // 为元素顶部保留 24px (6 * 4px) 的呼吸空间，避免消息内容直接紧贴滚动容器的上沿
    <div id={`message-${message.id}`} className={cn('chat-message-item flex w-full gap-4 scroll-mt-6', isUser ? 'flex-row-reverse chat-message-user' : 'flex-row chat-message-assistant')}>
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
        {!isUser && hasSteps && (
          <div className="mb-1 w-fit max-w-[400px] overflow-hidden rounded-md border border-border bg-card shadow-sm">
            <button
              onClick={() => setStepsExpanded(!stepsExpanded)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
            >
              {stepsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {message.status !== 'done' && message.status !== 'error' && !isGenerating ? (
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  思考过程...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-primary/70" />
                  已完成思考 ({message.steps?.length} 步)
                </span>
              )}
            </button>

            {stepsExpanded && (
              <div className="border-t border-border bg-muted/10 px-2 py-2">
                <div className="space-y-3">
                  {message.steps?.map((step, idx) => {
                    const isLastStep = idx === message.steps!.length - 1;
                    const isCurrent = message.status !== 'done' && message.status !== 'generating' && isLastStep;
                    
                    return (
                      <div key={idx} className="relative pl-6">
                        {/* 连接线 */}
                        {!isLastStep && (
                          <div className="absolute left-[9.5px] top-6 -bottom-2 border-l border-border/60" />
                        )}
                        
                        {/* 图标节点 */}
                        <div className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border shadow-sm">
                          <StepIcon status={step.status} isCurrent={isCurrent} />
                        </div>
                        
                        <div className={cn(
                          "text-xs leading-5 pt-0.5",
                          isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {step.message}
                          {step.details && (
                            <div className="mt-2 rounded-md bg-background/50 p-2 text-[11px] font-mono overflow-auto max-h-40 border border-border/50">
                              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-transparent prose-pre:m-0 prose-pre:p-0 prose-p:m-0">
                                {step.details}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

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
              {message.content ? <ReactMarkdown>{message.content}</ReactMarkdown> : (!message.status || message.status === 'done' ? null : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-6">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      正在生成回答...
                    </>
                  ) : (
                    <span className="animate-pulse">正在梳理逻辑...</span>
                  )}
                </div>
              ))}
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
