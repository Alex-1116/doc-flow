import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { documentApi } from '../../api/document';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ content: string; metadata: Record<string, string> }>;
}

interface Document {
  id: string;
  name: string;
  chunks: number;
}

interface ChatInterfaceProps {
  documents: Document[];
}

export default function ChatInterface({ documents }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await documentApi.query(input, 4);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || '处理您的问题时出现了错误';
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，${errorMessage}，请稍后重试。`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      console.error('查询错误:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-sm border overflow-hidden">
      {documents.length > 0 && (
        <div className="px-6 py-3 bg-purple-50 border-b">
          <span className="text-sm text-purple-700">
            当前知识库: {documents.map((d) => d.name).join(', ')}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">开始与文档对话</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              上传文档后，您可以向我询问任何关于文档内容的问题
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-2xl rounded-2xl px-5 py-4 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown className="prose prose-sm max-w-none">
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">来源:</p>
                    <div className="space-y-1">
                      {Array.from(new Set(message.sources.map((s) => s.metadata.filename || '未知文档')))
                        .slice(0, 2)
                        .map((filename, i) => (
                        <p key={i} className="text-xs text-gray-500">
                          {filename}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-5 py-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={documents.length === 0 ? '请先上传文档...' : '输入您的问题...'}
            disabled={documents.length === 0 || loading}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || documents.length === 0 || loading}
            className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
