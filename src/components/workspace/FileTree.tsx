'use client';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  FileCode,
  FileJson,
  FileTerminal,
  FileType,
  Image,
  File,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WorkspaceFile {
  id: string;
  path: string;
  fileName: string;
  language: string;
  size: number;
  content?: string;
  updatedAt: string;
}

interface FileTreeProps {
  files: WorkspaceFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
}

const FILE_ICONS: Record<string, { icon: typeof File; color: string }> = {
  typescript: { icon: FileCode, color: 'text-blue-400' },
  javascript: { icon: FileCode, color: 'text-yellow-400' },
  python: { icon: FileCode, color: 'text-green-400' },
  json: { icon: FileJson, color: 'text-amber-400' },
  html: { icon: FileCode, color: 'text-orange-400' },
  css: { icon: FileCode, color: 'text-blue-300' },
  scss: { icon: FileCode, color: 'text-pink-400' },
  markdown: { icon: FileType, color: 'text-zinc-400' },
  bash: { icon: FileTerminal, color: 'text-emerald-400' },
  sql: { icon: FileTerminal, color: 'text-sky-400' },
  rust: { icon: FileCode, color: 'text-red-400' },
  go: { icon: FileCode, color: 'text-cyan-400' },
  java: { icon: FileCode, color: 'text-red-300' },
};

function getFileIcon(language: string) {
  return FILE_ICONS[language] || { icon: FileText, color: 'text-zinc-400' };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type WorkspaceFileData = WorkspaceFile;

export const FileTree = memo(function FileTree({ files, selectedPath, onSelect, onDelete }: FileTreeProps) {
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  // Group by directory
  const dirMap = new Map<string, WorkspaceFile[]>();
  const rootFiles: WorkspaceFile[] = [];

  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/');
      if (!dirMap.has(dir)) dirMap.set(dir, []);
      dirMap.get(dir)!.push(file);
    } else {
      rootFiles.push(file);
    }
  }

  const renderFile = useCallback((file: WorkspaceFile) => {
    const { icon: Icon, color } = getFileIcon(file.language);
    const isSelected = selectedPath === file.path;

    return (
      <motion.div
        key={file.id}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted/50'
        )}
        onClick={() => onSelect(file.path)}
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{file.fileName}</div>
          <div className="text-[10px] text-muted-foreground">
            {file.language} • {formatFileSize(file.size)}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(file.path);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </motion.div>
    );
  }, [selectedPath, onSelect, onDelete]);

  if (sortedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <File className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No files in workspace</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Attach files in chat or use the upload button
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2 py-1">
      {rootFiles.map(renderFile)}
      {Array.from(dirMap.entries()).map(([dir, dirFiles]) => (
        <div key={dir}>
          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-2 first:mt-0">
            <span>📁</span>
            <span>{dir}</span>
          </div>
          {dirFiles.map(renderFile)}
        </div>
      ))}
    </div>
  );
});
