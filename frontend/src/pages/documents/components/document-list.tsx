import { FileText, Eye, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/libs/utils';
import type { Document } from '@/store/useChatStore';

interface DocumentListProps {
  documents: Document[];
  emptyDescription?: string;
  deletingId?: string | null;
  deleteError?: string | null;
  selectedDocumentId?: string | null;
  onView?: (document: Document) => void;
  onDelete?: (id: string) => void;
}

export default function DocumentList({
  documents,
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
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-12 text-slate-500">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700">暂无文档</p>
        <p className="mt-1 text-xs text-center text-slate-400">{emptyDescription}</p>
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

      <div className="space-y-3">
        {documents.map((doc) => {
          const isSelected = selectedDocumentId === doc.id;

          return (
            <div
              key={doc.id}
              className={cn(
                'group relative flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-all duration-300',
                'hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md',
                isSelected &&
                  'z-10 translate-x-2 scale-[1.01] border-violet-300 bg-violet-50/40 shadow-lg shadow-violet-100/80 after:absolute after:right-[-30px] after:top-1/2 after:h-px after:w-10 after:-translate-y-1/2 after:bg-gradient-to-r after:from-violet-300 after:to-transparent after:content-[""]'
              )}
            >
              <div className="flex min-w-0 items-center gap-4 overflow-hidden">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-medium text-slate-900" title={doc.name}>
                      {doc.name}
                    </h4>
                    <Badge variant="outline" className="border-slate-200 text-[11px] text-slate-500">
                      {getExtension(doc.name)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-col items-start gap-2 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                      {doc.chunks} 个分块
                    </span>
                    <span
                      className="max-w-full break-all font-mono text-[11px] text-slate-400"
                      title={doc.id}
                    >
                      ID: {doc.id}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-3 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-9 w-9 rounded-xl text-slate-400 transition-all',
                    'hover:bg-violet-50 hover:text-violet-700',
                    isSelected && 'bg-violet-50 text-violet-700 shadow-sm'
                  )}
                  onClick={() => onView?.(doc)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-9 w-9 rounded-xl text-slate-400 transition-all',
                    'hover:bg-red-50 hover:text-red-600',
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
