'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Square, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentSessionId } = useChatStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) return;
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-xl p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/30">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentSessionId
                ? 'Message Claude...'
                : 'Start a new conversation...'
            }
            className={cn(
              'flex-1 resize-none border-0 bg-transparent px-2 py-1.5',
              'text-sm leading-relaxed',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'placeholder:text-muted-foreground/60',
              'min-h-[36px] max-h-[200px]'
            )}
            rows={1}
            disabled={disabled}
          />

          {isStreaming ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8 rounded-xl flex-shrink-0"
              onClick={onStop}
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-8 w-8 rounded-xl flex-shrink-0 bg-primary hover:bg-primary/90"
              onClick={handleSend}
              disabled={!input.trim() || disabled}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground/50 mt-2 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          Claude can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}
