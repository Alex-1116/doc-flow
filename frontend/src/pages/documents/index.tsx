import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, FileStack, Files, Loader2, Upload, LayoutGrid, List } from 'lucide-react';
import DocumentList from '@/pages/documents/components/document-list';
import DocumentPreviewPanel from '@/pages/documents/components/document-preview-panel';
import UploadDocumentModal from '@/pages/documents/components/upload-document-modal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/libs/utils';
import { useDocuments } from '@/pages/documents/hooks/use-documents';

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const {
    documents,
    totalChunks,
    loading,
    previewLoading,
    previewOpen,
    uploadModalOpen,
    previewDocument,
    selectedDocumentId,
    deletingId,
    deleteError,
    handleUploadSuccess,
    handleOpenUploadModal,
    handleCloseUploadModal,
    handleViewDocument,
    handleClosePreview,
    handleDeleteDocument,
  } = useDocuments();

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-6 py-6 sm:py-8">
        <div className="mb-4">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>

        <Card className="relative overflow-hidden rounded-3xl border-border bg-card shadow-sm gap-0 p-0 ">
          <CardHeader className="relative overflow-hidden border-b border-border bg-card p-4 sm:p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background dark:from-primary/5 dark:via-card dark:to-card pointer-events-none" />
            <div className="relative flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
                    <Files className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Knowledge Base</p>
                    <CardTitle className="text-2xl font-semibold text-foreground">文档管理</CardTitle>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenUploadModal}
                  className={cn(
                    buttonVariants(),
                    'gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 hover:from-primary/90 hover:to-primary/70 border-none'
                  )}
                >
                  <Upload className="w-4 h-4" />
                  上传文档
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-6 p-4 sm:p-6">
            <div className="space-y-2">
              <div className="max-w-2xl text-sm leading-6 text-muted-foreground">
                统一查看当前知识库中的文档，管理入库内容，删除无效文件，保持检索结果更干净。
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  已入库 {documents.length} 个文档
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  共 {totalChunks} 个分块
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  删除后同步清理向量数据
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm">
                    <Files className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">文档数量</p>
                    <p className="text-lg font-semibold text-foreground">{documents.length}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm">
                    <FileStack className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">分块总数</p>
                    <p className="text-lg font-semibold text-foreground">{totalChunks}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm">
                    {loading || deletingId ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">数据状态</p>
                    <p className={cn(
                      "text-lg font-semibold",
                      loading || deletingId ? "text-primary" : "text-foreground"
                    )}>
                      {loading || deletingId ? "同步中..." : "已同步"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card className="border-border shadow-sm p-0 gap-0 bg-card">
            <CardHeader className="border-b border-border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-foreground">文档列表</CardTitle>
                  <CardDescription>
                    支持查看已上传文件和对应分块数量，也可在这里删除不需要的文档。
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'h-8 px-3 text-muted-foreground hover:text-foreground',
                      viewMode === 'list' && 'bg-background text-foreground shadow-sm'
                    )}
                  >
                    <List className="mr-2 h-4 w-4" />
                    列表
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'h-8 px-3 text-muted-foreground hover:text-foreground',
                      viewMode === 'grid' && 'bg-background text-foreground shadow-sm'
                    )}
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    网格
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 min-h-[320px]">
              {loading ? (
                <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在加载文档列表...
                </div>
              ) : (
                <DocumentList
                  documents={documents}
                  layout={viewMode}
                  emptyDescription="请先在上方上传文档"
                  deletingId={deletingId}
                  deleteError={deleteError}
                  selectedDocumentId={selectedDocumentId}
                  onView={handleViewDocument}
                  onDelete={handleDeleteDocument}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <DocumentPreviewPanel
        open={previewOpen}
        loading={previewLoading}
        document={previewDocument}
        onClose={handleClosePreview}
      />
      <UploadDocumentModal
        open={uploadModalOpen}
        onClose={handleCloseUploadModal}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
