import { useMemo, memo } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useShallow } from 'zustand/react/shallow';
import { useChatSidebar } from '@/features/chat/hooks/useChatSidebar';
import { useSessionTypewriter } from '@/features/chat/hooks/useSessionTypewriter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Search } from 'lucide-react';
import { cn } from '@/libs/utils';

// --- 抽离的独立 SessionItem 组件 ---
// 使用 React.memo 包裹，只有当它的 props 发生变化时（比如它自己变成了 active，或者自己的 title 变化了），它才会重新渲染
const SessionItem = memo(({ 
  session, 
  isActive, 
  displayTitle, 
  canDelete, 
  onSelect, 
  onDelete 
}: { 
  session: any; 
  isActive: boolean; 
  displayTitle: string; 
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <div className="flex-1 overflow-hidden">
        <p className="truncate">{displayTitle}</p>
      </div>
      
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "text-muted-foreground opacity-0 transition-opacity hover:text-destructive",
            "group-hover:opacity-100 focus:opacity-100"
          )}
          aria-label="删除会话"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

// 为了让 DevTools 里显示名字更好看
SessionItem.displayName = 'SessionItem';

export function ChatSidebar({ onClose }: { onClose?: () => void }) {
  // 1. 提取基础状态和方法（使用 useShallow 避免无关状态更新触发重渲染）
  const { activeSessionId, setActiveSession, createNewSession, deleteSession } = useChatStore(
    useShallow((state) => ({
      activeSessionId: state.activeSessionId,
      setActiveSession: state.setActiveSession,
      createNewSession: state.createNewSession,
      deleteSession: state.deleteSession,
    }))
  );

  // 2. 仅提取侧边栏需要的会话元数据（过滤掉流式输出时 messages 内容高频变化引起的重渲染）
  const sessionsMetaString = useChatStore((state) => 
    JSON.stringify(state.sessions.map((s) => ({
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      messagesLength: s.messages.length
    })))
  );

  const sessions = useMemo(() => {
    return JSON.parse(sessionsMetaString).map((meta: any) => ({
      id: meta.id,
      title: meta.title,
      updatedAt: meta.updatedAt,
      messages: { length: meta.messagesLength } as any
    }));
  }, [sessionsMetaString]);
  
  // 侧边栏状态管理（搜索、分组）
  const { searchQuery, setSearchQuery, groupedSessions } = useChatSidebar(sessions);
  
  // 独立的打字机动画
  const animatedTitles = useSessionTypewriter(sessions);

  return (
    <div className="flex h-full w-full flex-col bg-transparent overflow-hidden">
      <div className="p-4 shrink-0 flex flex-col gap-3">
        <Button
          size="lg"
          onClick={() => {
            createNewSession();
            onClose?.();
          }}
          className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary shadow-none backdrop-blur-sm"
        >
          <Plus className="h-4 w-4" />
          新对话
        </Button>
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索历史记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 bg-muted/50 border-transparent focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden group/sidebar-scroll">
        <ScrollArea className="h-full px-3 [&_[data-slot=scroll-area-scrollbar]]:opacity-0 [&_[data-slot=scroll-area-scrollbar]]:transition-opacity [&_[data-slot=scroll-area-scrollbar]]:duration-300 group-hover/sidebar-scroll:[&_[data-slot=scroll-area-scrollbar]]:opacity-100">
          <div className="space-y-6 pb-4">
            {groupedSessions.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {searchQuery ? "未找到匹配的会话" : "暂无历史记录"}
              </div>
            ) : (
              groupedSessions.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="px-3 text-xs font-medium text-muted-foreground mb-2">
                    {group.label}
                  </div>
                  {group.sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const displayTitle = animatedTitles[session.id] ?? session.title;
                    {/* 逻辑梳理：
                      1. 当 sessions.length > 1 时，说明列表里有多个会话，允许删除任何一个。
                      2. 当 sessions.length === 1 时，这是唯一的一条记录。
                        2.1 如果这条记录的 title 不是 '新对话'，或者它已经有消息了，说明这是一条"有价值"的历史记录，允许用户删除它（删除后底层会自动生成一条干净的'新对话'兜底）。
                        2.2 只有当它是唯一的记录，且 title 就是 '新对话' 且是一条空记录时，才不展示删除按钮（因为删了它系统又会生成一个一模一样的，毫无意义）。
                    */}
                    const canDelete = sessions.length > 1 || session.title !== '新对话' || (session.messages && session.messages.length > 0);

                    return (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={isActive}
                        displayTitle={displayTitle}
                        canDelete={canDelete}
                        onSelect={() => {
                          setActiveSession(session.id);
                          onClose?.();
                        }}
                        onDelete={() => deleteSession(session.id)}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
