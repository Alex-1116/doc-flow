import { Link } from 'react-router-dom';
import { ArrowLeft, Database, FileStack, Files, Loader2, Upload } from 'lucide-react';
import DocumentList from '@/pages/documents/components/document-list';
import DocumentPreviewPanel from '@/pages/documents/components/document-preview-panel';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/libs/utils';
import { useDocuments } from '@/pages/documents/hooks/use-documents';

export default function DocumentsPage() {
  const {
    documents,
    totalChunks,
    loading,
    previewLoading,
    previewOpen,
    previewDocument,
    selectedDocumentId,
    deletingId,
    deleteError,
    handleViewDocument,
    handleClosePreview,
    handleDeleteDocument,
  } = useDocuments();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <main className="max-w-5xl mx-auto px-6 py-6 sm:py-8">
        <div className="mb-4">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>

        <Card className="relative overflow-hidden rounded-3xl border-slate-200 shadow-sm gap-0 p-0 ">
          <CardHeader className="relative bg-gradient-to-r from-violet-100/70 via-sky-100/60 to-transparent p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-sm">
                    <Files className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-violet-600">Knowledge Base</p>
                    <CardTitle className="text-2xl font-semibold text-slate-900">文档管理</CardTitle>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/home"
                  className={cn(
                    buttonVariants(),
                    'gap-2 bg-violet-600 text-white hover:bg-violet-700 [a]:hover:bg-violet-700 [a]:hover:text-white'
                  )}
                >
                  <Upload className="w-4 h-4" />
                  上传新文档
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-6 p-4 sm:p-6">
            <div className="space-y-2">
              <div className="max-w-2xl text-sm leading-6 text-slate-600">
                统一查看当前知识库中的文档，管理入库内容，删除无效文件，保持检索结果更干净。
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-violet-50 text-violet-700">
                  已入库 {documents.length} 个文档
                </Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  共 {totalChunks} 个分块
                </Badge>
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  删除后同步清理向量数据
                </Badge>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Files className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">文档数量</p>
                    <p className="text-lg font-semibold text-slate-900">{documents.length}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <FileStack className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">分块总数</p>
                    <p className="text-lg font-semibold text-slate-900">{totalChunks}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">数据状态</p>
                    <p className="text-lg font-semibold text-slate-900">已同步</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card className="border-slate-200 shadow-sm p-0 gap-0">
            <CardHeader className="border-b border-slate-100 p-4 sm:p-6">
              <CardTitle className="text-slate-900">文档列表</CardTitle>
              <CardDescription>
                支持查看已上传文件和对应分块数量，也可在这里删除不需要的文档。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 min-h-[320px]">
              {loading ? (
                <div className="flex min-h-[240px] items-center justify-center text-slate-500">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在加载文档列表...
                </div>
              ) : (
                <DocumentList
                    documents={documents}
                  emptyDescription="请先返回首页上传文档"
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
    </div>
  );
}
