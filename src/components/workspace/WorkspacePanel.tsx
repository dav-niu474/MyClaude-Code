'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  RefreshCw,
  ChevronLeft,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTree, type WorkspaceFileData } from './FileTree';
import { FilePreview } from './FilePreview';
import { cn } from '@/lib/utils';

interface WorkspacePanelProps {
  open: boolean;
  onToggle: () => void;
}

export function WorkspacePanel({ open, onToggle }: WorkspacePanelProps) {
  const [files, setFiles] = useState<WorkspaceFileData[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<WorkspaceFileData | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspace/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load workspace files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open, loadFiles]);

  const handleSelect = useCallback(async (path: string) => {
    setSelectedPath(path);
    try {
      const res = await fetch(`/api/workspace/files/${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFile({
          id: data.file.id,
          path: data.file.path,
          fileName: data.file.fileName,
          language: data.file.language,
          size: data.file.size,
          content: data.file.content,
          updatedAt: data.file.updatedAt,
        });
      }
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  }, []);

  const handleDelete = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/workspace/files/${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.path !== path));
        if (selectedPath === path) {
          setSelectedPath(null);
          setSelectedFile(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  }, [selectedPath]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      for (const file of Array.from(fileList)) {
        const content = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
          ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
          py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
          c: 'c', cpp: 'cpp', html: 'html', css: 'css', json: 'json',
          yaml: 'yaml', yml: 'yaml', xml: 'xml', sql: 'sql', md: 'markdown',
          sh: 'bash', bash: 'bash',
        };
        const language = langMap[ext] || 'text';

        const res = await fetch('/api/workspace/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: file.name, content, language }),
        });

        if (!res.ok) {
          console.error('Failed to upload:', file.name);
        }
      }

      await loadFiles();
    } catch (err) {
      console.error('Upload error:', err);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [loadFiles]);

  if (selectedFile) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="preview"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="flex flex-col h-full bg-background"
        >
          <FilePreview
            path={selectedFile.path}
            content={selectedFile.content || ''}
            language={selectedFile.language}
            size={selectedFile.size}
            onClose={() => setSelectedFile(null)}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="tree"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="flex flex-col h-full bg-background"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Workspace Files</h3>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {files.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadFiles}
              disabled={loading}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* File tree */}
        <ScrollArea className="flex-1">
          <FileTree
            files={files}
            selectedPath={selectedPath}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
