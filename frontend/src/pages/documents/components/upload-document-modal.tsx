import { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import FileUpload from '@/features/document/file-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/libs/utils';

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (doc: { doc_id: string; filename: string; chunks: number }) => void;
}

export default function UploadDocumentModal({
  open,
  onClose,
  onSuccess,
}: UploadDocumentModalProps) {
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      return;
    }

    const timer = window.setTimeout(() => setShouldRender(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!shouldRender) return null;

  const handleSuccess = (doc: { doc_id: string; filename: string; chunks: number }) => {
    onSuccess(doc);
    onClose();
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 hidden xl:block',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="关闭上传弹层"
        className={cn(
          'absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
        <Card
          className={cn(
            'pointer-events-auto w-full max-w-4xl overflow-hidden rounded-3xl border-slate-200 p-0 shadow-2xl shadow-slate-300/40',
            'transition-all duration-300 ease-out gap-0',
            open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'
          )}
        >
          <CardHeader className="border-b border-slate-100 bg-white/90 p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-violet-600">
                  <Upload className="h-3.5 w-3.5" />
                  上传文档
                </div>
                <CardTitle className="text-lg text-slate-900">添加新的知识库文档</CardTitle>
                <CardDescription>
                  上传完成后，文档会自动加入当前知识库列表。
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[80vh] overflow-y-auto bg-slate-50/50 p-6">
            <FileUpload onSuccess={handleSuccess} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
