'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Bot, User, RotateCcw, FileDown, Pencil, Save, X, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  isLastAssistant?: boolean;
}

interface ApplyCodeDialogProps {
  code: string;
  language: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function inferLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin',
    html: 'html', css: 'css', scss: 'scss', json: 'json',
    yaml: 'yaml', yml: 'yaml', xml: 'xml', sql: 'sql',
    sh: 'bash', bash: 'bash', zsh: 'bash',
    md: 'markdown', mdx: 'markdown',
    dockerfile: 'dockerfile',
  };
  return langMap[ext] || language;
}

function ApplyCodeDialog({ code, language, open, onOpenChange }: ApplyCodeDialogProps) {
  const [mode, setMode] = useState<'apply' | 'edit'>('apply');
  const [filePath, setFilePath] = useState('');
  const [editedCode, setEditedCode] = useState(code);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!filePath.trim()) {
      setError('Please enter a file path');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/workspace/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath.trim(),
          content: mode === 'edit' ? editedCode : code,
          language: inferLanguageFromPath(filePath.trim()),
        }),
      });

      if (res.ok) {
        onOpenChange(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save file');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleModeSwitch = (newMode: 'apply' | 'edit') => {
    setMode(newMode);
    if (newMode === 'edit') {
      setEditedCode(code);
    }
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Save to Workspace</DialogTitle>
          <DialogDescription>
            Save this {language || 'code'} to your workspace files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="file-path">File Path</Label>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground flex-shrink-0">/</div>
              <Input
                id="file-path"
                placeholder="src/components/example.tsx"
                value={filePath}
                onChange={(e) => { setFilePath(e.target.value); setError(''); }}
                className="font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !saving) handleSave();
                }}
              />
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant={mode === 'apply' ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => handleModeSwitch('apply')}
            >
              <FileDown className="w-3.5 h-3.5" />
              Apply
            </Button>
            <Button
              variant={mode === 'edit' ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => handleModeSwitch('edit')}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit & Apply
            </Button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
              <span className="text-xs font-mono text-muted-foreground">
                {mode === 'edit' ? 'Editing' : 'Preview'} • {language || 'code'}
              </span>
              {mode === 'edit' && (
                <span className="text-[10px] text-muted-foreground">Edit before saving</span>
              )}
            </div>
            {mode === 'edit' ? (
              <Textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                className="font-mono text-xs min-h-[200px] max-h-[400px] resize-none border-0 rounded-none focus-visible:ring-0 p-3 bg-muted/20"
                spellCheck={false}
              />
            ) : (
              <pre className="p-3 text-xs font-mono bg-muted/20 overflow-auto max-h-[300px] leading-relaxed text-foreground/80">
                {code}
              </pre>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !filePath.trim()}>
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1" />
                Save to Workspace
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 my-3">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground">{language || 'code'}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setApplyOpen(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/80"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Apply</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/80"
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

      <ApplyCodeDialog
        code={code}
        language={language}
        open={applyOpen}
        onOpenChange={setApplyOpen}
      />
    </>
  );
}

// Message action button component
function ActionButton({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors',
            className
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming,
  onRegenerate,
  onEditMessage,
  onDeleteMessage,
  isLastAssistant,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() && editContent.trim() !== message.content && onEditMessage) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  }, [editContent, message.id, message.content, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const components = useMemo(
    () => ({
      code({ className, children, ...props }: { className?: string; children?: React.ReactNode; [key: string]: unknown }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

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
        </div>

        {/* Edit mode for user messages */}
        {isUser && isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] max-h-[200px] resize-y text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSaveEdit();
                }
                if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim() || editContent.trim() === message.content} className="h-7 text-xs gap-1">
                <Save className="w-3 h-3" />
                Save & Resubmit
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 text-xs gap-1">
                <X className="w-3 h-3" />
                Cancel
              </Button>
              <span className="text-[10px] text-muted-foreground ml-1">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save
              </span>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-foreground/90 break-words">
            {isUser ? (
              <p className="leading-7 whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown components={components as never}>
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {isStreaming && (
          <div className="flex items-center gap-1 mt-2">
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Action buttons - shown on hover */}
        {!isStreaming && (
          <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy - always available */}
            <ActionButton
              icon={copied ? Check : Copy}
              label={copied ? 'Copied!' : 'Copy'}
              onClick={handleCopy}
            />
            {/* Edit - user messages only */}
            {isUser && onEditMessage && (
              <ActionButton
                icon={Pencil}
                label="Edit"
                onClick={() => { setEditContent(message.content); setIsEditing(true); }}
              />
            )}
            {/* Regenerate - last assistant message only */}
            {!isUser && isLastAssistant && onRegenerate && (
              <ActionButton
                icon={RotateCcw}
                label="Regenerate"
                onClick={() => onRegenerate(message.id)}
              />
            )}
            {/* Delete - always available */}
            {onDeleteMessage && (
              <ActionButton
                icon={Trash2}
                label="Delete"
                onClick={() => onDeleteMessage(message.id)}
                className="hover:text-destructive"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});
