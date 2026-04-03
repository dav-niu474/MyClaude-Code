'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback, ReactNode } from 'react';
import { Send, Square, Sparkles, Paperclip, X, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';

interface AttachedFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  children?: ReactNode;
}

function inferLanguageFromFileName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    c: 'c', cpp: 'cpp', cs: 'csharp', php: 'php', swift: 'swift',
    kt: 'kotlin', html: 'html', css: 'css', scss: 'scss', json: 'json',
    yaml: 'yaml', yml: 'yaml', xml: 'xml', sql: 'sql', md: 'markdown',
    sh: 'bash', bash: 'bash',
  };
  return map[ext] || 'text';
}

export function ChatInput({ onSend, onStop, disabled, isStreaming, children }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { currentSessionId } = useChatStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input, attachedFiles]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    // Build message with file references
    let message = trimmed;
    if (attachedFiles.length > 0) {
      const fileRefs = attachedFiles
        .map((f) => `[Attached file: ${f.path}]`)
        .join('\n');
      message = `${fileRefs}\n\n${trimmed}`;
    }

    onSend(message);
    setInput('');
    setAttachedFiles([]);
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newFiles: AttachedFile[] = [];

    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const language = inferLanguageFromFileName(file.name);
        const path = file.name; // Use filename as path by default

        // Upload to workspace
        const res = await fetch('/api/workspace/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, content, language }),
        });

        if (res.ok) {
          newFiles.push({ name: file.name, path, content, language });
        } else {
          console.error('Failed to upload file:', file.name);
        }
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Voice input / ASR
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Convert to base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Audio = reader.result as string;
          try {
            const res = await fetch('/api/asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data.text) {
                setInput((prev) => prev ? `${prev} ${data.text}` : data.text);
                textareaRef.current?.focus();
              }
            } else {
              toast.error('Failed to transcribe audio');
            }
          } catch {
            toast.error('Failed to transcribe audio');
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        toast.error('Failed to access microphone');
      }
    }
  }, [isRecording]);

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-xl p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/30">
          {/* Microphone button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 rounded-xl flex-shrink-0 transition-colors',
              isRecording
                ? 'text-destructive hover:text-destructive/80 animate-pulse'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={toggleRecording}
            disabled={disabled || uploading}
          >
            {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </Button>

          {/* File attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".ts,.tsx,.js,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.cs,.php,.swift,.kt,.html,.css,.scss,.json,.yaml,.yml,.xml,.sql,.md,.sh,.bash,.txt,.csv,.toml,.ini,.cfg,.env,.dockerfile,.log"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>

          {/* Extra action buttons from parent (e.g. image upload) */}
          {children}

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
              'flex-1 resize-none border-0 bg-transparent px-1 py-1.5',
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
              disabled={(!input.trim() && attachedFiles.length === 0) || disabled || uploading}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Attached files chips */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {attachedFiles.map((file, index) => (
              <div
                key={`${file.path}-${index}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/80 border border-border text-xs group"
              >
                <Paperclip className="w-3 h-3 text-muted-foreground" />
                <span className="max-w-[150px] truncate text-foreground/80">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {uploading && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/80 border border-border text-xs text-muted-foreground">
                <div className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground/50 mt-2 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          Claude can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}
