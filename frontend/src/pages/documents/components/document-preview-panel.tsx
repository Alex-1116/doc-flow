import { FileText, Loader2, PanelRightClose, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/libs/utils';
import type { DocumentDetailResponse } from '@/api/document';

interface DocumentPreviewPanelProps {
  open: boolean;
  loading: boolean;
  document: DocumentDetailResponse | null;
  onClose: () => void;
}

const getFileTypeLabel = (fileType: string) => {
  if (!fileType) return '文档';
  return fileType.replace('.', '').toUpperCase();
};

export default function DocumentPreviewPanel({
  open,
  loading,
  document,
  onClose,
}: DocumentPreviewPanelProps) {
  return (
    <aside
      className={cn(
        'pointer-events-none fixed right-6 top-1/2 z-40 hidden h-[78vh] -translate-y-1/2 xl:block',
        'transition-all duration-300 ease-out',
        open ? 'translate-x-0 -translate-y-1/2 opacity-100' : 'translate-x-10 -translate-y-1/2 opacity-0'
      )}
      {...(!open ? { inert: "" } : {})}
    >
      <Card
        className={cn(
          'h-full w-[500px] gap-0 overflow-hidden border-border p-0',
          open ? 'pointer-events-auto' : 'pointer-events-none',
          'shadow-2xl shadow-foreground/10 ring-1 ring-border rounded-3xl'
        )}
      >
        <CardHeader className="border-b border-border bg-background/90 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                阅读器
              </div>
              <CardTitle className="truncate text-lg text-foreground font-semibold">
                {document?.name ?? '文档预览'}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {document?.file_type && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary font-normal">
                    {getFileTypeLabel(document.file_type)}
                  </Badge>
                )}
                {document && (
                  <Badge variant="outline" className="border-border text-muted-foreground font-normal">
                    {document.chunks} 个分块
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onClose}
              aria-label="关闭侧边栏"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex h-full flex-col overflow-hidden bg-muted/30 p-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在加载文档内容...
            </div>
          ) : document ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-border bg-background px-5 py-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  Document ID
                </p>
                <p className="break-all font-mono text-[11px] text-muted-foreground">{document.id}</p>
              </div>
              <ScrollArea className="flex-1 min-h-0 w-full">
                <div className="p-5">
                  <div className="rounded-2xl border border-border bg-card px-5 py-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <FileText className="h-4 w-4 text-primary" />
                      原文内容
                    </div>
                    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/90">
                      {document.content || '当前文档暂无可预览内容。'}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center text-muted-foreground">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
                <FileText className="h-6 w-6 text-muted-foreground/70" />
              </div>
              <p className="text-sm font-medium text-foreground/80">选择一篇文档开始阅读</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground/80">
                点击列表中的“查看”，右侧会展开一个独立阅读器窗口。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
