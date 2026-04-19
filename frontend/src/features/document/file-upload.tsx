import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { documentApi } from '@/api/document';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/libs/utils';

interface FileUploadProps {
  onSuccess: (doc: { doc_id: string; filename: string; chunks: number }) => void;
}

const SUPPORTED_FORMATS = ['.pdf', '.txt', '.md', '.markdown', '.docx'];

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await documentApi.upload(file);

      setSuccess(true);
      setTimeout(() => {
        onSuccess(response);
        setSuccess(false);
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || '上传失败，请重试';
      setError(errorMessage);
      console.error('上传错误:', err);
    } finally {
      setUploading(false);
    }
  }, [onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md', '.markdown'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="space-y-6">
      <div {...getRootProps()}>
        <Card
          className={cn(
            'ring-0 border-2 border-dashed cursor-pointer transition-all group overflow-hidden bg-card',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>正在处理文档...</span>
                </div>
              ) : success ? (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-500">
                  <CheckCircle className="w-5 h-5" />
                  <span>上传成功！</span>
                </div>
              ) : isDragActive ? (
                <p className="text-primary font-medium">松开以上传文件</p>
              ) : (
                <>
                  <p className="text-lg font-medium text-foreground">
                    拖拽文件到此处，或点击上传
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    支持 {SUPPORTED_FORMATS.join(', ')} 格式
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>上传失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        {SUPPORTED_FORMATS.map((format) => (
          <Card key={format} className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <Badge variant="secondary" className="font-mono bg-muted text-muted-foreground hover:bg-muted/80">
                {format}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
