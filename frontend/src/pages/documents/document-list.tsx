import { useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { documentApi } from '@/api/document';
import { FileText, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/libs/utils';

interface DocumentListProps {
  emptyDescription?: string;
}

export default function DocumentList({
  emptyDescription = '请先上传文档',
}: DocumentListProps) {
  const documents = useChatStore((state) => state.documents);
  const removeDocument = useChatStore((state) => state.removeDocument);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);
      await documentApi.delete(id);
      removeDocument(id);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '删除文档失败');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

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
      {error && (
        <Alert variant="destructive" className="py-2 px-3 text-xs">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={cn(
              'group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-all',
              'hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md'
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

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'ml-3 h-9 w-9 rounded-xl text-slate-400 transition-all',
                'hover:bg-red-50 hover:text-red-600',
                'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
              )}
              onClick={() => handleDelete(doc.id)}
              disabled={deletingId === doc.id}
            >
              {deletingId === doc.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
