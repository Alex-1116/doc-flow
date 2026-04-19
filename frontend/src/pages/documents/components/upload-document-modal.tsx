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
          'absolute inset-0 bg-background/80 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
        <Card
          className={cn(
            'pointer-events-auto w-full max-w-4xl overflow-hidden rounded-3xl border-border p-0 shadow-2xl shadow-foreground/5',
            'transition-all duration-300 ease-out gap-0',
            open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'
          )}
        >
          <CardHeader className="border-b border-border bg-background/90 p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Upload className="h-3.5 w-3.5" />
                  上传文档
                </div>
                <CardTitle className="text-lg text-foreground">添加新的知识库文档</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  上传完成后，文档会自动加入当前知识库列表。
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[80vh] overflow-y-auto bg-muted/30 p-6">
            <FileUpload onSuccess={handleSuccess} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
