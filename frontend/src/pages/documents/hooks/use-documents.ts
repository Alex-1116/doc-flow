import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { documentApi, type DocumentDetailResponse } from '@/api/document';
import { useChatStore, type Document } from '@/store/useChatStore';

export function useDocuments() {
  const documents = useChatStore((state) => state.documents);
  const addDocument = useChatStore((state) => state.addDocument);
  const setDocuments = useChatStore((state) => state.setDocuments);
  const removeDocument = useChatStore((state) => state.removeDocument);

  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentDetailResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const previewRequestRef = useRef(0);

  const totalChunks = useMemo(
    () => documents.reduce((sum, doc) => sum + doc.chunks, 0),
    [documents]
  );

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await documentApi.list();
        setDocuments(response.documents ?? []);
      } catch (error) {
        console.error('获取文档列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadDocuments();
  }, [setDocuments]);

  useEffect(() => {
    if (selectedDocumentId && !documents.some((doc) => doc.id === selectedDocumentId)) {
      setSelectedDocumentId(null);
      setPreviewDocument(null);
      setPreviewOpen(false);
    }
  }, [documents, selectedDocumentId]);

  const handleViewDocument = useCallback(async (document: Document) => {
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;

    setSelectedDocumentId(document.id);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewDocument(null);

    try {
      const detail = await documentApi.getDetail(document.id);
      if (previewRequestRef.current === requestId) {
        setPreviewDocument(detail);
      }
    } catch (error) {
      if (previewRequestRef.current === requestId) {
        setPreviewDocument(null);
      }
      console.error('获取文档详情失败:', error);
    } finally {
      if (previewRequestRef.current === requestId) {
        setPreviewLoading(false);
      }
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setSelectedDocumentId(null);
    setPreviewDocument(null);
  }, []);

  const handleOpenUploadModal = useCallback(() => {
    setUploadModalOpen(true);
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setUploadModalOpen(false);
  }, []);

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      try {
        setDeletingId(id);
        setDeleteError(null);
        await documentApi.delete(id);
        removeDocument(id);

        if (selectedDocumentId === id) {
          handleClosePreview();
        }
      } catch (err: any) {
        setDeleteError(err.response?.data?.detail || err.message || '删除文档失败');
        console.error('Delete error:', err);
      } finally {
        setDeletingId(null);
      }
    },
    [handleClosePreview, removeDocument, selectedDocumentId]
  );

  const handleUploadSuccess = useCallback(
    (doc: { doc_id: string; filename: string; chunks: number }) => {
      const exists = documents.some((item) => item.id === doc.doc_id);
      if (!exists) {
        addDocument({ id: doc.doc_id, name: doc.filename, chunks: doc.chunks });
      }
    },
    [addDocument, documents]
  );

  return {
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
  };
}
