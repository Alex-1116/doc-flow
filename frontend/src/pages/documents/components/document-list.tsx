import { FileText, Eye, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/libs/utils';
import type { Document } from '@/store/useChatStore';

interface DocumentListProps {
  documents: Document[];
  layout?: 'list' | 'grid';
  emptyDescription?: string;
  deletingId?: string | null;
  deleteError?: string | null;
  selectedDocumentId?: string | null;
  onView?: (document: Document) => void;
  onDelete?: (id: string) => void;
}

export default function DocumentList({
  documents,
  layout = 'list',
  emptyDescription = '请先上传文档',
  deletingId,
  deleteError,
  selectedDocumentId,
  onView,
  onDelete,
}: DocumentListProps) {
  const getExtension = (filename: string) => {
    const extension = filename.split('.').pop();
    return extension ? extension.toUpperCase() : 'FILE';
  };

  if (documents.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-12 text-muted-foreground">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">暂无文档</p>
        <p className="mt-1 text-xs text-center text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deleteError && (
        <Alert variant="destructive" className="py-2 px-3 text-xs">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="ml-2">{deleteError}</AlertDescription>
        </Alert>
      )}

      <div className={cn(
        layout === 'list' ? 'space-y-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
      )}>
        {documents.map((doc) => {
          const isSelected = selectedDocumentId === doc.id;

          return (
            <div
              key={doc.id}
              className={cn(
                'group relative flex rounded-2xl border border-border bg-card px-4 py-4 transition-all duration-300',
                'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
                layout === 'list' ? 'items-center justify-between' : 'flex-col items-start gap-4 h-full',
                isSelected && layout === 'list' &&
                  'z-10 translate-x-2 scale-[1.01] border-primary/40 bg-primary/5 shadow-lg shadow-primary/10 after:absolute after:right-[-30px] after:top-1/2 after:h-px after:w-10 after:-translate-y-1/2 after:bg-gradient-to-r after:from-primary/40 after:to-transparent after:content-[""]',
                isSelected && layout === 'grid' &&
                  'z-10 border-primary/40 bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02] ring-1 ring-primary/20'
              )}
            >
              <div className={cn("flex min-w-0 overflow-hidden p-[1px] -m-[1px]", layout === 'list' ? 'items-center gap-4' : 'items-start gap-3 w-full')}>
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-medium text-foreground" title={doc.name}>
                      {doc.name}
                    </h4>
                    <Badge variant="outline" className="border-border text-[11px] text-muted-foreground">
                      {getExtension(doc.name)}
                    </Badge>
                  </div>
                  <div className={cn("mt-2 flex text-xs text-muted-foreground", layout === 'list' ? 'flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center' : 'flex-col gap-2')}>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground w-fit">
                      {doc.chunks} 个分块
                    </span>
                    <span
                      className="max-w-full break-all font-mono text-[11px] text-muted-foreground"
                      title={doc.id}
                    >
                      ID: {doc.id}
                    </span>
                  </div>
                </div>
              </div>

              <div className={cn("flex items-center gap-1", layout === 'list' ? 'ml-3' : 'mt-auto pt-4 w-full justify-end border-t border-border/50')}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-9 w-9 rounded-xl text-muted-foreground transition-all',
                    'hover:bg-primary/10 hover:text-primary',
                    isSelected && 'bg-primary/10 text-primary shadow-sm'
                  )}
                  onClick={() => onView?.(doc)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-9 w-9 rounded-xl text-muted-foreground transition-all',
                    'hover:bg-destructive/10 hover:text-destructive',
                  )}
                  onClick={() => onDelete?.(doc.id)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
