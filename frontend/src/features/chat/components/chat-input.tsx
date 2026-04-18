import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({ input, setInput, handleSend, disabled, placeholder }: ChatInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!disabled && containerRef.current) {
      const textarea = containerRef.current.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }
  }, [disabled]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();

      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;
      const nextValue = `${input.slice(0, selectionStart)}\n${input.slice(selectionEnd)}`;

      setInput(nextValue);

      requestAnimationFrame(() => {
        const nextCursorPosition = selectionStart + 1;
        textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
      });
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t bg-white">
      <div className="relative" ref={containerRef}>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || '输入您的问题 (Ctrl/Cmd+Enter 换行)...'}
          disabled={disabled}
          className="w-full min-h-[100px] max-h-[300px] px-4 py-3 pb-12 bg-gray-100 rounded-xl border-0 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed text-base resize-none scrollbar-thin"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          size="icon"
          className="absolute bottom-2 right-2 h-8 w-8 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span className="sr-only">发送</span>
        </Button>
      </div>
    </div>
  );
}
