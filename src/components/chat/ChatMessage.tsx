'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Bot, User, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Message } from '@/types';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs font-mono text-muted-foreground">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={isDark ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
        }}
        showLineNumbers={code.split('\n').length > 3}
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: 'hsl(var(--muted-foreground))',
          opacity: 0.5,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const components = useMemo(
    () => ({
      code({ className, children, ...props }: { className?: string; children?: React.ReactNode; [key: string]: unknown }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        // Inline code (no language class, short content)
        if (!match && codeString.length < 100 && !codeString.includes('\n')) {
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        }

        return <CodeBlock language={match ? match[1] : ''} code={codeString} />;
      },
      p({ children }: { children?: React.ReactNode }) {
        return <p className="mb-3 last:mb-0 leading-7">{children}</p>;
      },
      ul({ children }: { children?: React.ReactNode }) {
        return <ul className="mb-3 space-y-1 list-disc pl-6">{children}</ul>;
      },
      ol({ children }: { children?: React.ReactNode }) {
        return <ol className="mb-3 space-y-1 list-decimal pl-6">{children}</ol>;
      },
      li({ children }: { children?: React.ReactNode }) {
        return <li className="leading-7">{children}</li>;
      },
      h1({ children }: { children?: React.ReactNode }) {
        return <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>;
      },
      h2({ children }: { children?: React.ReactNode }) {
        return <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>;
      },
      h3({ children }: { children?: React.ReactNode }) {
        return <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>;
      },
      blockquote({ children }: { children?: React.ReactNode }) {
        return (
          <blockquote className="border-l-4 border-primary/30 pl-4 py-1 mb-3 bg-muted/30 rounded-r-lg">
            {children}
          </blockquote>
        );
      },
      table({ children }: { children?: React.ReactNode }) {
        return (
          <div className="overflow-x-auto mb-3 rounded-lg border border-border">
            <table className="w-full">{children}</table>
          </div>
        );
      },
      th({ children }: { children?: React.ReactNode }) {
        return (
          <th className="px-4 py-2 bg-muted/50 text-left text-sm font-semibold border-b border-border">
            {children}
          </th>
        );
      },
      td({ children }: { children?: React.ReactNode }) {
        return (
          <td className="px-4 py-2 text-sm border-b border-border">{children}</td>
        );
      },
      a({ href, children }: { href?: string; children?: React.ReactNode }) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {children}
          </a>
        );
      },
      hr() {
        return <hr className="my-4 border-border" />;
      },
    }),
    []
  );

  return (
    <div
      className={cn(
        'group flex gap-4 py-4 px-4 md:px-6',
        isUser ? 'bg-transparent' : 'bg-muted/20'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <Bot className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{isUser ? 'You' : 'Claude'}</span>
          {!isStreaming && !isUser && (
            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="prose prose-sm max-w-none text-foreground/90 break-words">
          {isUser ? (
            <p className="leading-7 whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown components={components as never}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {isStreaming && (
          <div className="flex items-center gap-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
});
