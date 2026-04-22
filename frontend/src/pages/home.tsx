import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Files, MessageSquare } from 'lucide-react';
import ChatInterface from '@/features/chat/chat-interface';
import { useChatStore } from '@/store/useChatStore';
import { documentApi } from '@/api/document';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/libs/utils';

export default function Home() {
  const documents = useChatStore((state) => state.documents);
  const setDocuments = useChatStore((state) => state.setDocuments);

  useEffect(() => {
    // 页面加载时获取已有的文档列表
    documentApi.list().then((res) => {
      if (res.documents && res.documents.length > 0) {
        setDocuments(res.documents);
      }
    }).catch((err) => {
      console.error('获取文档列表失败:', err);
    });
  }, [setDocuments]);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <main className="flex-1 overflow-hidden w-full max-w-5xl mx-auto px-0 py-0 md:px-6 md:py-6 flex flex-col">
        {documents.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Files className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">工作台</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                当前还没有可用文档。请先前往文档管理上传知识库内容，再回到这里开始问答。
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link
                  to="/documents"
                  className={cn(buttonVariants(), 'gap-2 bg-primary text-primary-foreground hover:bg-primary/90')}
                >
                  <Files className="h-4 w-4" />
                  前往文档管理
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  上传后即可开始问答
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatInterface documents={documents} />
          </div>
        )}
      </main>
    </div>
  );
}
