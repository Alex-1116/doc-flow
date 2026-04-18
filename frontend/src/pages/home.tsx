import { useEffect } from 'react';
import { FileText, Upload, MessageSquare } from 'lucide-react';
import FileUpload from '@/features/document/file-upload';
import ChatInterface from '@/features/chat/chat-interface';
import { useChatStore } from '@/store/useChatStore';
import { documentApi } from '@/api/document';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  }, [setDocuments, setActiveTab]);

  const handleUploadSuccess = (doc: { doc_id: string; filename: string; chunks: number }) => {
    addDocument({ id: doc.doc_id, name: doc.filename, chunks: doc.chunks });
    setActiveTab('chat');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-5xl mx-auto w-full px-4 py-4">
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

      <main className="flex-1 overflow-hidden w-full max-w-5xl mx-auto px-6 py-6 flex flex-col">
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'upload' | 'chat')}
          className="flex-1 flex flex-col gap-4 min-h-0"
        >
          <TabsList className="flex-shrink-0 self-start group-data-horizontal/tabs:h-auto p-1">
            <TabsTrigger value="upload" className="flex items-center gap-2 py-2 px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-colors text-base">
              <Upload className="w-4 h-4 text-blue-500 " />
              上传文档
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2 py-2 px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-colors text-base">
              <MessageSquare className="w-4 h-4 text-purple-500 " />
              开始问答
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="h-full overflow-y-auto mt-0 data-[state=active]:block">
            <div className="max-w-2xl mx-auto py-4">
              <FileUpload onSuccess={handleUploadSuccess} />
            </div>
          </TabsContent>
          
          <TabsContent value="chat" className="mt-0 h-full min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ChatInterface documents={documents} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
