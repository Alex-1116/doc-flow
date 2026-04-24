import { useChatStore } from '@/store/useChatStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/libs/utils';

export function ChatSidebar({ onClose }: { onClose?: () => void }) {
  const { sessions, activeSessionId, setActiveSession, createNewSession, deleteSession } = useChatStore();

  return (
    <div className="flex h-full w-full flex-col bg-transparent overflow-hidden">
      <div className="p-4 shrink-0">
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
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-3">
          <div className="space-y-2 pb-4">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    setActiveSession(session.id);
                    onClose?.();
                  }}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate">{session.title}</p>
                    <p className="truncate text-xs opacity-60 font-normal mt-0.5">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className={cn(
                        "absolute right-2 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive",
                        "group-hover:opacity-100 focus:opacity-100"
                      )}
                      aria-label="删除会话"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
