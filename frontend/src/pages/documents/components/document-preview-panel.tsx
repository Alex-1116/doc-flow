import { FileText, Loader2, PanelRightClose, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      aria-hidden={!open}
    >
      <Card
        className={cn(
          'h-full w-[500px] gap-0 overflow-hidden border-slate-200 p-0',
          open ? 'pointer-events-auto' : 'pointer-events-none',
          'shadow-2xl shadow-slate-300/50 ring-1 ring-slate-200/80'
        )}
      >
        <CardHeader className="border-b border-slate-100 bg-white/90 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-violet-600">
                <Sparkles className="h-3.5 w-3.5" />
                阅读器
              </div>
              <CardTitle className="truncate text-lg text-slate-900">
                {document?.name ?? '文档预览'}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {document?.file_type && (
                  <Badge variant="secondary" className="bg-violet-50 text-violet-700">
                    {getFileTypeLabel(document.file_type)}
                  </Badge>
                )}
                {document && (
                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                    {document.chunks} 个分块
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex h-full flex-col overflow-hidden bg-slate-50/50 p-0">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在加载文档内容...
            </div>
          ) : document ? (
            <>
              <div className="border-b border-slate-100 bg-white px-5 py-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Document ID
                </p>
                <p className="break-all font-mono text-[11px] text-slate-500">{document.id}</p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileText className="h-4 w-4 text-violet-500" />
                    原文内容
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {document.content || '当前文档暂无可预览内容。'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center text-slate-500">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">选择一篇文档开始阅读</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                点击列表中的“查看”，右侧会展开一个独立阅读器窗口。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
