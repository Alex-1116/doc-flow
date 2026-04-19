import { Upload, X } from 'lucide-react';
import FileUpload from '@/features/document/file-upload';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  const handleSuccess = (doc: { doc_id: string; filename: string; chunks: number }) => {
    onSuccess(doc);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl p-0 overflow-hidden border-border bg-card rounded-3xl gap-0 shadow-2xl shadow-foreground/5">
        {/* Header 区域 */}
        <div className="border-b border-border bg-background/90 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Upload className="h-3.5 w-3.5" />
                上传文档
              </div>
              <DialogTitle className="text-lg text-foreground m-0 p-0">添加新的知识库文档</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground m-0 p-0">
                上传完成后，文档会自动加入当前知识库列表。
              </DialogDescription>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onClose}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Content 区域 */}
        <div className="max-h-[80vh] overflow-y-auto bg-muted/30 p-6">
          <FileUpload onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
