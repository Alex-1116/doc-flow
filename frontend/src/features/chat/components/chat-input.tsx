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
    <div className="border-t border-border bg-background p-4">
      <div className="flex flex-col gap-2 mx-auto relative" ref={containerRef}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex w-full items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm transition-all duration-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              disabled
                ? '需要先上传文档才能开始对话'
                : placeholder || '输入您的问题... (Ctrl/Cmd + Enter 换行)'
            }
            disabled={disabled}
            className="min-h-[100px] w-full resize-none border-0 bg-muted/50 py-3 pl-4 pr-12 text-sm focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            rows={1}
          />
          <Button
            type="submit"
            disabled={!input.trim() || disabled}
            size="icon"
            className={`absolute bottom-3 right-3 h-8 w-8 shrink-0 rounded-xl transition-all ${
              input.trim() && !disabled
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <div className="hidden md:flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px]">
              Enter
            </kbd>
            发送
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px]">
              Ctrl/Cmd + Enter
            </kbd>
            换行
          </span>
        </div>
      </div>
    </div>
  );
}
