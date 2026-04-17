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
    <div className="px-6 py-3 bg-purple-50 border-b flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-purple-700 whitespace-nowrap">当前知识库:</span>
        <Popover>
          <PopoverTrigger>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-purple-700 bg-white border border-purple-200 shadow-sm hover:bg-purple-50 hover:border-purple-300 hover:text-purple-800 hover:shadow-md transition-all duration-200 cursor-pointer group">
              <div className="p-1 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                <Library className="w-3.5 h-3.5" />
              </div>
              <span>{documents.length} 份可用文档</span>
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0 overflow-hidden shadow-lg border-purple-100">
            <div className="p-3 border-b bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="搜索文档名称..."
                  className="pl-9 h-9 bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin p-2">
              {filteredDocuments.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  未找到匹配的文档
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  {filteredDocuments.map((d) => (
                    <div
                      key={d.id}
                      className="px-3 py-2 rounded-md hover:bg-purple-50 transition-colors flex flex-col gap-1"
                    >
                      <span className="text-sm font-medium text-gray-700 truncate" title={d.name}>
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
