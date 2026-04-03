'use client';

import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  FileText,
  FilePlus,
  FileEdit,
  FolderTree,
  Code,
  Brain,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCall } from '@/types';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

const TOOL_ICONS: Record<string, { icon: typeof Globe; color: string; label: string }> = {
  web_search: { icon: Globe, color: 'text-blue-400', label: 'Web Search' },
  file_read: { icon: FileText, color: 'text-amber-400', label: 'Read File' },
  file_write: { icon: FilePlus, color: 'text-green-400', label: 'Write File' },
  file_edit: { icon: FileEdit, color: 'text-orange-400', label: 'Edit File' },
  file_list: { icon: FolderTree, color: 'text-purple-400', label: 'List Files' },
  code_analyze: { icon: Code, color: 'text-pink-400', label: 'Analyze Code' },
};

function getToolConfig(name: string) {
  return TOOL_ICONS[name] ?? { icon: Brain, color: 'text-zinc-400', label: name };
}

function getArgumentsPreview(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'web_search':
      return args.query as string || '';
    case 'file_read':
    case 'file_write':
    case 'file_edit':
      return args.path as string || '';
    case 'code_analyze':
      return `${args.language || 'code'} • ${((args.code as string) || '').length} chars`;
    default:
      return Object.entries(args).map(([k, v]) => `${k}: ${v}`).join(', ');
  }
}

function getActionDescription(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'web_search':
      return `Searching for "${args.query}"`;
    case 'file_read':
      return `Reading ${args.path}`;
    case 'file_write':
      return `Writing to ${args.path}`;
    case 'file_edit':
      return `Editing ${args.path}`;
    case 'file_list':
      return 'Listing workspace files';
    case 'code_analyze':
      return `Analyzing ${args.language || ''} code`;
    default:
      return `Running ${name}`;
  }
}

interface SearchResultItem {
  title?: string;
  url?: string;
  snippet?: string;
  name?: string;
}

function parseSearchResults(content: string): SearchResultItem[] {
  const results: SearchResultItem[] = [];
  const lines = content.split('\n');
  let current: SearchResultItem | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      if (current) results.push(current);
      current = { title: numMatch[2] };
      continue;
    }

    if (current) {
      const urlMatch = trimmed.match(/^(?:URL|Link|url):\s*(.+)/i);
      if (urlMatch) {
        current.url = urlMatch[1];
        continue;
      }

      const snippetMatch = trimmed.match(/^(?:Snippet|snippet|Description|description):\s*(.+)/i);
      if (snippetMatch) {
        current.snippet = snippetMatch[1];
        continue;
      }

      // If it looks like a URL (starts with http)
      if (trimmed.startsWith('http')) {
        current.url = trimmed;
        continue;
      }

      // If no title and looks like a heading
      if (!current.title && !trimmed.startsWith('-') && !trimmed.startsWith('http')) {
        current.title = trimmed;
      }
    }
  }

  if (current) results.push(current);
  return results;
}

function FileOperationArgs({ name, args }: { name: string; args: Record<string, unknown> }) {
  const filePath = args.path as string | undefined;
  if (!filePath) return null;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <code className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono truncate max-w-[280px] sm:max-w-[400px]">
        {filePath}
      </code>
    </div>
  );
}

function SearchResults({ result }: { result: string }) {
  const results = useMemo(() => parseSearchResults(result), [result]);

  if (results.length === 0) {
    return (
      <div className="mt-2 text-xs text-zinc-400 whitespace-pre-wrap font-mono">
        {result.length > 500 ? result.slice(0, 500) + '...' : result}
      </div>
    );
  }

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Search className="w-3 h-3" />
        <span>{results.length} results found</span>
      </div>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {results.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 p-2 rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-colors group"
          >
            <div className="flex-shrink-0 w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-medium mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-zinc-200 group-hover:text-blue-300 transition-colors truncate">
                {item.title || 'Result'}
              </div>
              {item.url && (
                <div className="text-[10px] text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                  {item.url.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                </div>
              )}
              {item.snippet && (
                <div className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                  {item.snippet}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ToolResultContent({ toolCall }: { toolCall: ToolCall }) {
  if (!toolCall.result) return null;

  if (toolCall.name === 'web_search') {
    return <SearchResults result={toolCall.result} />;
  }

  return (
    <div className="mt-2.5">
      <pre className="text-xs text-zinc-400 bg-zinc-800/50 rounded-md p-2.5 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto leading-relaxed">
        {toolCall.result.length > 1000 ? toolCall.result.slice(0, 1000) + '\n...' : toolCall.result}
      </pre>
    </div>
  );
}

export const ToolCallCard = memo(function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = getToolConfig(toolCall.name);
  const Icon = config.icon;
  const argPreview = getArgumentsPreview(toolCall.name, toolCall.arguments);
  const actionDesc = getActionDescription(toolCall.name, toolCall.arguments);
  const hasResult = toolCall.result && toolCall.result.length > 0;
  const isFileOp = ['file_read', 'file_write', 'file_edit'].includes(toolCall.name);
  const isSearchOp = toolCall.name === 'web_search';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mx-4 md:mx-6 my-2"
    >
      <div className="rounded-lg bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm">
        {/* Header */}
        <button
          onClick={() => hasResult && setExpanded(!expanded)}
          disabled={!hasResult}
          className={cn(
            'w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors',
            hasResult ? 'hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'
          )}
        >
          {/* Status indicator */}
          <div className="flex-shrink-0">
            {toolCall.status === 'running' && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            )}
            {toolCall.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            {toolCall.status === 'error' && (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
          </div>

          {/* Tool icon */}
          <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />

          {/* Tool name and action */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-semibold uppercase tracking-wide',
                toolCall.status === 'error' ? 'text-red-400' : 'text-zinc-300'
              )}>
                {config.label}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{toolCall.id.slice(0, 8)}</span>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5 truncate">
              {toolCall.status === 'running' ? actionDesc : argPreview}
            </div>
          </div>

          {/* Expand toggle */}
          {hasResult && (
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </motion.div>
          )}

          {/* Status badge */}
          <div>
            {toolCall.status === 'running' && (
              <span className="text-[10px] font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                Running
              </span>
            )}
            {toolCall.status === 'completed' && (
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                Done
              </span>
            )}
            {toolCall.status === 'error' && (
              <span className="text-[10px] font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                Error
              </span>
            )}
          </div>
        </button>

        {/* Running progress bar */}
        <AnimatePresence>
          {toolCall.status === 'running' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="h-0.5 bg-zinc-800">
                <motion.div
                  className="h-full bg-blue-500/60 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline file path for file operations */}
        {isFileOp && !expanded && (
          <FileOperationArgs name={toolCall.name} args={toolCall.arguments} />
        )}

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && hasResult && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3.5 pb-3 border-t border-zinc-800/50">
                {/* Arguments section for non-search ops */}
                {!isSearchOp && Object.keys(toolCall.arguments).length > 0 && (
                  <div className="mt-2.5 mb-1">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                      Arguments
                    </div>
                    <div className="space-y-1">
                      {Object.entries(toolCall.arguments).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-[10px] text-zinc-500 font-mono w-20 flex-shrink-0 pt-0.5">
                            {key}:
                          </span>
                          <span className="text-xs text-zinc-300 font-mono break-all">
                            {key === 'code' || key === 'content' || key === 'new_string' || key === 'old_string'
                              ? `${(value as string || '').slice(0, 200)}${(value as string || '').length > 200 ? '...' : ''}`
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Result */}
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                    Result
                  </div>
                  {toolCall.status === 'error' ? (
                    <div className="text-xs text-red-400 bg-red-400/5 border border-red-400/20 rounded-md p-2.5">
                      {toolCall.result}
                    </div>
                  ) : (
                    <ToolResultContent toolCall={toolCall} />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
