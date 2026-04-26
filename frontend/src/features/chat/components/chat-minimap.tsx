import { useEffect, useState } from 'react';
import { cn } from '@/libs/utils';
import { Message } from '../types';

interface ChatMinimapProps {
  messages: Message[];
}

export function ChatMinimap({ messages }: ChatMinimapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // 观察聊天消息元素，看哪个在可视区域内
    const observer = new IntersectionObserver(
      (entries) => {
        // 找到所有在视野内的元素
        const visibleEntries = entries.filter(e => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // 如果有多个在视野内，我们可以取第一个，或者取 intersectionRatio 最大的
          const mostVisible = visibleEntries.reduce((prev, current) => 
            (prev.intersectionRatio > current.intersectionRatio) ? prev : current
          );
          const id = mostVisible.target.id.replace('message-', '');
          setActiveId(id);
        }
      },
      {
        root: document.getElementById('chat-scroll-container'),
        threshold: 0.5, // 元素至少有 50% 可见才算
      }
    );

    // 仅观察用户的 message 节点，因为大段的 AI 回复不适合作为导航锚点，大纲/目录效应（Table of Contents）
    const elements = document.querySelectorAll('.chat-message-user');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [messages]); // 当消息列表变化时重新绑定观察者

  if (messages.length === 0) return null;

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`message-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const userMessages = messages.filter(msg => msg.role === 'user');
  if (userMessages.length === 0) return null;

  return (
    <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end gap-2 group pointer-events-auto">
      {/* 悬浮容器 */}
      <div className="flex flex-col gap-2.5 py-4 px-3 rounded-2xl transition-all duration-300 bg-transparent hover:bg-background/80 hover:shadow-lg hover:border border-transparent hover:border-border hover:backdrop-blur-sm">
        {userMessages.map((msg) => {
          const isActive = activeId === msg.id;
          
          // 获取文字预览
          let textPreview = msg.content.replace(/\n/g, ' ').trim();
          if (!textPreview) {
            textPreview = msg.loadingMessage ? '思考中...' : '...';
          }
          
          return (
            <button
              key={msg.id}
              onClick={() => scrollToMessage(msg.id)}
              className="flex items-center justify-end gap-3 cursor-pointer group/item"
              title="用户提问"
            >
              {/* 文字预览 (默认隐藏，外部容器 hover 时展开) */}
              <span className="text-[11px] text-muted-foreground opacity-0 w-0 overflow-hidden whitespace-nowrap text-ellipsis transition-all duration-300 group-hover:opacity-100 group-hover:w-36 text-right">
                {textPreview}
              </span>
              
              {/* 标尺线 */}
              <div 
                className={cn(
                  "h-1 rounded-full transition-all duration-300 shrink-0",
                  isActive 
                    ? "w-4 bg-primary" 
                    : "w-2.5 bg-muted-foreground/30 group-hover/item:bg-muted-foreground group-hover/item:w-4"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
