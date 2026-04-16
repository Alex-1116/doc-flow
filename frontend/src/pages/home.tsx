import { useEffect } from 'react';
import { FileText, Upload, MessageSquare } from 'lucide-react';
import FileUpload from '@/features/document/file-upload';
import ChatInterface from '@/features/chat/chat-interface';
import { useChatStore } from '@/store/useChatStore';
import { documentApi } from '@/api/document';

export default function Home() {
  const activeTab = useChatStore((state) => state.activeTab);
  const setActiveTab = useChatStore((state) => state.setActiveTab);
  const documents = useChatStore((state) => state.documents);
  const addDocument = useChatStore((state) => state.addDocument);
  const setDocuments = useChatStore((state) => state.setDocuments);

  useEffect(() => {
    // 页面加载时获取已有的文档列表
    documentApi.list().then((res) => {
      if (res.documents && res.documents.length > 0) {
        setDocuments(res.documents);
        setActiveTab('chat'); // 如果有文档，默认直接进入问答界面
      }
    }).catch((err) => {
      console.error('获取文档列表失败:', err);
    });
  }, []);

  const handleUploadSuccess = (doc: { doc_id: string; filename: string; chunks: number }) => {
    addDocument({ id: doc.doc_id, name: doc.filename, chunks: doc.chunks });
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">DocFlow</h1>
                <p className="text-sm text-gray-500">智能文档摘要与问答系统</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {documents.length > 0 && (
                <span className="text-sm text-gray-500">
                  已上传 {documents.length} 个文档
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            上传文档
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            开始问答
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <FileUpload onSuccess={handleUploadSuccess} />
          </div>
        )}

        {activeTab === 'chat' && <ChatInterface documents={documents} />}
      </div>
    </div>
  );
}
