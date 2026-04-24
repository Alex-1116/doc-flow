import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Library, Search, FileText, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Document } from '../types';
import { ChatSidebarToggle } from './chat-sidebar-toggle';

interface ChatHeaderProps {
  documents: Document[];
}

export function ChatHeader({ documents }: ChatHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = documents.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (documents.length === 0) return null;

  return (
    <div className="flex h-[60px] items-center justify-between border-b border-border bg-primary/5 px-4">
      <div className="flex items-center gap-3">
        <ChatSidebarToggle />

        <span className="hidden md:inline whitespace-nowrap text-sm font-medium text-muted-foreground">当前知识库</span>
        <Popover>
          <PopoverTrigger>
            <div className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-muted hover:text-primary hover:shadow-sm">
              <Library className="h-4 w-4 text-primary" />
              <span>{documents.length} 份文档</span>
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 overflow-hidden border-border gap-0 p-0 shadow-lg">
            <div className="border-b border-border bg-muted/50 p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索文档名称..."
                  className="h-9 bg-background pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin p-2 bg-card">
              {filteredDocuments.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  未找到匹配的文档
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  {filteredDocuments.map((d) => (
                    <div
                      key={d.id}
                      className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/80"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 shrink-0 text-primary/70" />
                        <span className="truncate text-sm font-medium text-foreground" title={d.name}>
                          {d.name}
                        </span>
                      </div>
                      <Link
                        to="/documents"
                        title="前往文档管理"
                        className="flex-shrink-0 rounded-md p-1.5 opacity-0 transition-all hover:text-primary focus:opacity-100 group-hover:opacity-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
