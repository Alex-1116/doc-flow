import { useState } from 'react';
import { Library, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Document } from '../types';

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
    <div className="flex items-center justify-between border-b bg-purple-50 px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-sm font-medium text-slate-500">当前知识库</span>
        <Popover>
          <PopoverTrigger>
            <div className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-violet-200 hover:bg-white hover:text-violet-700 hover:shadow-sm">
              <Library className="h-4 w-4 text-violet-500" />
              <span>{documents.length} 份文档</span>
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 overflow-hidden border-slate-200 gap-0 p-0 shadow-lg">
            <div className="border-b bg-slate-50/70 p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索文档名称..."
                  className="h-9 bg-white pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin p-2">
              {filteredDocuments.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  未找到匹配的文档
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  {filteredDocuments.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-1 rounded-xl px-3 py-2 transition-colors hover:bg-violet-50/70"
                    >
                      <span className="truncate text-sm font-medium text-slate-700" title={d.name}>
                        {d.name}
                      </span>
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
