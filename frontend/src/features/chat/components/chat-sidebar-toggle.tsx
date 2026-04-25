import { useState } from 'react';
import { PanelLeft, PanelLeftClose, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChatSidebar } from './chat-sidebar';
import { useChatStore } from '@/store/useChatStore';

export function ChatSidebarToggle() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSidebarPinned = useChatStore((state) => state.isSidebarPinned);
  const setSidebarPinned = useChatStore((state) => state.setSidebarPinned);

  return (
    <>
      {/* 桌面端且已固定时：只显示一个收起侧边栏的普通按钮 */}
      {isSidebarPinned && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="hidden md:flex shrink-0 text-muted-foreground hover:text-foreground" 
          onClick={() => setSidebarPinned(false)}
          title="收起侧边栏"
        >
          <PanelLeftClose className="h-5 w-5" />
        </Button>
      )}

      {/* 移动端（始终）或桌面端未固定时：显示抽屉按钮 */}
      <div className={isSidebarPinned ? "md:hidden" : "block"}>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0 text-muted-foreground hover:text-foreground" 
            onClick={() => setSidebarOpen(true)}
            title="展开会话历史"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="flex flex-col border-r border-border bg-background/80 backdrop-blur-xl">
            <SheetHeader className="h-[60px] border-b border-border/50 p-4 flex flex-row items-center justify-between space-y-0 bg-transparent pr-4 md:pr-12">
              <SheetTitle className="text-sm font-semibold">会话历史</SheetTitle>
              {/* 只在桌面端显示固定按钮 */}
              <Button 
                variant="ghost" 
                size="icon-sm" 
                className="hidden md:flex text-muted-foreground hover:text-foreground -mt-1.5" 
                onClick={() => {
                  setSidebarPinned(true);
                  setSidebarOpen(false);
                }}
                title="固定到左侧"
              >
                <Pin className="h-4 w-4" />
              </Button>
            </SheetHeader>
            <div className="flex-1 overflow-hidden bg-transparent">
              <ChatSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
