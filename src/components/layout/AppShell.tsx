'use client';

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { ThemeProvider } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  LogOut,
  Terminal,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  Search,
  Moon,
  Sun,
  Monitor,
  X,
  FileCode,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  Thermometer,
  MessageCircle,
  Download,
  ArrowDown,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AuthPage } from '@/components/auth/AuthPage';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ToolCallCard } from '@/components/chat/ToolCallCard';
import { WorkspacePanel } from '@/components/workspace/WorkspacePanel';
import { Session, Message, ToolCall } from '@/types';
import { useTheme } from 'next-themes';

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20"
        >
          <Terminal className="w-10 h-10" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-2">Welcome to MyClaude Code</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your private AI coding assistant. Start a conversation to get help with coding,
            debugging, architecture decisions, and more.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="space-y-3"
        >
          <Button onClick={onNewChat} size="lg" className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Start New Chat
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { title: 'Write Code', desc: 'Generate code from descriptions' },
              { title: 'Debug Issues', desc: 'Find and fix bugs' },
              { title: 'Explain Code', desc: 'Understand complex codebases' },
              { title: 'Architecture', desc: 'Design decisions & patterns' },
            ].map((item) => (
              <button
                key={item.title}
                onClick={onNewChat}
                className="text-left p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="text-sm font-medium group-hover:text-primary transition-colors">{item.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const DEFAULT_SYSTEM_PROMPT = '';

const MODEL_OPTIONS = [
  { value: 'default', label: 'Default', description: 'Standard model' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', description: 'Balanced speed & quality' },
  { value: 'claude-opus-4', label: 'Claude Opus 4', description: 'Maximum capability' },
];

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { theme, setTheme, model, setModel, temperature, setTemperature, systemPrompt, setSystemPrompt } = useSettingsStore();
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const { currentSessionId, sessions, setSessions } = useChatStore();
  const [localTheme, setLocalTheme] = useState(theme);
  const [sessionName, setSessionName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // Sync session name when current session changes
  useEffect(() => {
    if (currentSession) {
      setSessionName(currentSession.title);
    }
  }, [currentSession?.id]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setLocalTheme(newTheme);
    setTheme(newTheme);
    if (newTheme === 'system') {
      setNextTheme('system');
    } else {
      setNextTheme(newTheme);
    }
  };

  const handleRenameSession = async () => {
    if (!currentSessionId || !sessionName.trim() || sessionName.trim() === currentSession?.title) return;
    setIsRenaming(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentSessionId, title: sessionName.trim() }),
      });
      if (res.ok) {
        setSessions(sessions.map((s) => s.id === currentSessionId ? { ...s, title: sessionName.trim() } : s));
      }
    } catch (error) {
      console.error('Failed to rename session:', error);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize your MyClaude Code experience</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appearance Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Appearance</h4>
            </div>
            <p className="text-xs text-muted-foreground">Choose your preferred color theme</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value as 'light' | 'dark' | 'system')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                    localTheme === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <Icon className={cn('w-5 h-5', localTheme === value ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-xs', localTheme === value ? 'font-medium' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Session Rename Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Session Name</h4>
            </div>
            <p className="text-xs text-muted-foreground">Rename the current chat session</p>
            {currentSession ? (
              <div className="flex gap-2">
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSession();
                  }}
                />
                <Button
                  onClick={handleRenameSession}
                  disabled={!sessionName.trim() || sessionName.trim() === currentSession?.title || isRenaming}
                  size="sm"
                >
                  {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No active session selected</p>
            )}
          </div>

          <Separator />

          {/* Model Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">AI Model</h4>
            </div>
            <p className="text-xs text-muted-foreground">Choose which AI model to use for responses</p>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Temperature Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Temperature</h4>
              </div>
              <Badge variant="secondary" className="text-xs tabular-nums">
                {temperature.toFixed(1)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Control creativity. Lower values are more focused, higher values are more creative.
            </p>
            <Slider
              value={[temperature]}
              onValueChange={([val]) => setTemperature(val)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          <Separator />

          {/* System Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">System Prompt</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                disabled={systemPrompt === DEFAULT_SYSTEM_PROMPT}
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Default
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set a custom system prompt to customize how Claude behaves in this session.
            </p>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g., You are an expert in React and TypeScript. Always provide code examples..."
              className="min-h-[100px] resize-y"
              rows={4}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getToolStatusMessage(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'web_search':
      return `Searching the web for "${args.query}"`;
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

function ActivityIndicator({ toolCalls }: { toolCalls: ToolCall[] }) {
  const runningTools = toolCalls.filter((tc) => tc.status === 'running');
  const lastRunning = runningTools[runningTools.length - 1];

  if (runningTools.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-4 md:mx-6 my-2"
    >
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/30 border border-border">
        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Claude is {getToolStatusMessage(lastRunning.name, lastRunning.arguments).toLowerCase()}...
        </span>
        {runningTools.length > 1 && (
          <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-full">
            +{runningTools.length - 1} more
          </span>
        )}
      </div>
    </motion.div>
  );
}

function exportConversation(messages: Message[], sessionTitle: string) {
  const md = `# ${sessionTitle}\n\nExported from MyClaude Code on ${new Date().toLocaleString()}\n\n---\n\n${messages.map(m => {
    const role = m.role === 'user' ? '**You**' : '**Claude**';
    return `### ${role}\n\n${m.content}\n\n`;
  }).join('---\n\n')}`;

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function AppContent() {
  const {
    user, isAuthenticated, isLoading, logout
  } = useAuthStore();
  const {
    sessions, currentSessionId, messages, isStreaming, streamingContent,
    toolCalls, activeToolName,
    setSessions, setCurrentSession, addSession, removeSession,
    setStreaming, setStreamingContent, appendStreamingContent, addMessage, reset,
    addToolCall, updateToolCall, clearToolCalls, setActiveToolName,
  } = useChatStore();
  const { sidebarCollapsed, setSidebarCollapsed, model, temperature, systemPrompt } = useSettingsStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    await useAuthStore.getState().checkAuth();
  };

  // Load sessions when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated]);

  // Auto-scroll on new messages
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, streamingContent, toolCalls]);

  // Track scroll position for scroll-to-bottom button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const scrollToBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape → stop streaming
      if (e.key === 'Escape' && isStreaming) {
        e.preventDefault();
        handleStopStreaming();
        return;
      }

      // Cmd/Ctrl + K → new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
        return;
      }

      // Cmd/Ctrl + , → settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }

      // Cmd/Ctrl + / → toggle sidebar (only when not focused on input)
      if ((e.metaKey || e.ctrlKey) && e.key === '/' && !isInputFocused) {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, sidebarCollapsed]);

  // Image upload handler
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      // Convert to base64 data URL
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, []);

  const removeImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (res.ok) {
        const data = await res.json();
        addSession(data.session);
        setCurrentSession(data.session.id);
        setSidebarMobileOpen(false);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      const res = await fetch(`/api/sessions?id=${sessionToDelete}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        removeSession(sessionToDelete);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  // Message action handlers
  const handleRegenerateMessage = useCallback(async (messageId: string) => {
    if (!currentSessionId || isStreaming) return;
    // Find the user message before this assistant message
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 1) return;
    const userMsg = messages[msgIndex - 1];
    if (!userMsg || userMsg.role !== 'user') return;
    // Remove this assistant message from UI and resend
    useChatStore.setState({ messages: messages.slice(0, msgIndex) });
    await sendMessageWithSession(currentSessionId, userMsg.content);
  }, [currentSessionId, messages, isStreaming]);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentSessionId || isStreaming) return;
    // Find message index, remove it and all subsequent messages
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 0) return;
    useChatStore.setState({ messages: messages.slice(0, msgIndex) });
    // Re-send with new content
    await sendMessageWithSession(currentSessionId, newContent);
  }, [currentSessionId, messages, isStreaming]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (isStreaming) return;
    useChatStore.setState({ messages: messages.filter((m) => m.id !== messageId) });
  }, [messages, isStreaming]);

  // Find last assistant message id for regenerate button
  const lastAssistantMsgId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Build full message content with image references
    let fullMessage = content;
    if (attachedImages.length > 0) {
      const imageRefs = attachedImages
        .map((img, i) => `[Attached image ${i + 1}]`)
        .join('\n');
      fullMessage = `${imageRefs}\n\n${content}`;
      setAttachedImages([]);
    }

    if (!currentSessionId) {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content.substring(0, 50) }),
        });
        if (res.ok) {
          const data = await res.json();
          addSession(data.session);
          await setCurrentSession(data.session.id);
          await sendMessageWithSession(data.session.id, fullMessage);
        }
      } catch (error) {
        console.error('Failed to create session:', error);
      }
      return;
    }

    await sendMessageWithSession(currentSessionId, fullMessage);
  };

  const sendMessageWithSession = async (sessionId: string, content: string) => {
    // Add user message to UI immediately
    addMessage({
      id: `temp-user-${Date.now()}`,
      sessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    });

    setStreaming(true);
    setStreamingContent('');
    clearToolCalls();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content, model, temperature, systemPrompt }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'delta') {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              } else if (parsed.type === 'done') {
                fullContent = parsed.content;
                setStreamingContent(fullContent);
              } else if (parsed.type === 'tool_call') {
                // AI wants to call a tool
                const toolCall: ToolCall = {
                  id: parsed.id,
                  name: parsed.name,
                  arguments: parsed.arguments || {},
                  status: 'running',
                };
                addToolCall(toolCall);
              } else if (parsed.type === 'tool_result') {
                // Tool execution result
                updateToolCall(parsed.id, {
                  status: parsed.success ? 'completed' : 'error',
                  result: parsed.content,
                });
              } else if (parsed.type === 'tool_call_progress') {
                // Tool is executing
                updateToolCall(parsed.id, {
                  status: parsed.status || 'running',
                });
              } else if (parsed.type === 'error') {
                console.error('Stream error:', parsed.error);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Add final assistant message
      if (fullContent) {
        addMessage({
          id: `assistant-${Date.now()}`,
          sessionId,
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString(),
        });
      }

      // Refresh sessions to get updated titles
      await loadSessions();
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        id: `error-${Date.now()}`,
        sessionId,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setStreaming(false);
      setStreamingContent('');
      setActiveToolName(null);
    }
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setStreaming(false);
    setActiveToolName(null);
    // Keep whatever content was streamed
    if (streamingContent) {
      addMessage({
        id: `assistant-${Date.now()}`,
        sessionId: currentSessionId!,
        role: 'assistant',
        content: streamingContent,
        createdAt: new Date().toISOString(),
      });
      setStreamingContent('');
    }
  };

  const handleLogout = async () => {
    await logout();
    reset();
  };

  const hasActiveContent = currentSessionId || messages.length > 0;

  // Auth loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center animate-pulse">
            <Terminal className="w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const filteredSessions = searchQuery
    ? sessions.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="h-dvh flex overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card/50 transition-all duration-300 z-50',
          'md:relative md:z-auto',
          sidebarCollapsed ? 'md:w-0 md:overflow-hidden md:border-0' : 'md:w-72',
          sidebarMobileOpen
            ? 'fixed inset-y-0 left-0 w-72 shadow-xl'
            : 'fixed inset-y-0 left-0 w-72 shadow-xl -translate-x-full md:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center flex-shrink-0">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm truncate">MyClaude Code</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 md:hidden"
            onClick={() => setSidebarMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2 rounded-xl"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="pl-8 h-8 text-xs rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Session List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 py-1">
            {filteredSessions.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">
                {searchQuery ? 'No matching chats' : 'No chats yet'}
              </div>
            )}
            {filteredSessions.map((session: Session) => (
              <div
                key={session.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                  currentSessionId === session.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => {
                  setCurrentSession(session.id);
                  setSidebarMobileOpen(false);
                }}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{session.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {session._count.messages} messages
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch(`/api/messages?sessionId=${session.id}`);
                          if (res.ok) {
                            const data = await res.json();
                            exportConversation(data.messages || [], session.title);
                          }
                        } catch (err) {
                          console.error('Failed to export session:', err);
                        }
                      }}
                    >
                      <Download className="w-3.5 h-3.5 mr-2" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-3 space-y-1">
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {user.name?.[0] || user.email[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{user.name || 'User'}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-1"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-1"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse sidebar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-1 text-destructive hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Collapsed sidebar toggle */}
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 z-30 h-8 w-8 rounded-lg bg-card border border-border shadow-sm"
          onClick={() => setSidebarCollapsed(false)}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setSidebarMobileOpen(true)}
          >
            <PanelLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            {currentSession && (
              <Badge variant="secondary" className="font-normal text-xs truncate max-w-[200px]">
                {currentSession.title}
              </Badge>
            )}
            {!currentSession && (
              <span className="text-sm text-muted-foreground">MyClaude Code</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={messages.length === 0}
                  onClick={() => exportConversation(messages, currentSession?.title || 'conversation')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as Markdown</TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="text-xs font-normal gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </Badge>
          </div>
        </div>

        {/* Main area: Tabs + Content */}
        {hasActiveContent ? (
          <>
            {/* Tab bar */}
            <div className="flex items-center border-b border-border bg-muted/20 px-4">
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors relative',
                  activeTab === 'chat'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
                {activeTab === 'chat' && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors relative',
                  activeTab === 'files'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                <FileCode className="w-4 h-4" />
                Files
                {activeTab === 'files' && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 relative min-h-0">
              <AnimatePresence mode="wait">
                {activeTab === 'chat' && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    {/* Chat area */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
                      <div className="max-w-3xl mx-auto">
                        {messages.map((msg: Message) => (
                          <ChatMessage
                            key={msg.id}
                            message={msg}
                            isLastAssistant={msg.id === lastAssistantMsgId}
                            onRegenerate={handleRegenerateMessage}
                            onEditMessage={handleEditMessage}
                            onDeleteMessage={handleDeleteMessage}
                          />
                        ))}

                        {/* Tool calls - rendered between user message and AI response */}
                        <AnimatePresence>
                          {toolCalls.map((tc) => (
                            <ToolCallCard key={tc.id} toolCall={tc} />
                          ))}
                        </AnimatePresence>

                        {/* Activity indicator */}
                        <AnimatePresence>
                          {isStreaming && toolCalls.some((tc) => tc.status === 'running') && (
                            <ActivityIndicator toolCalls={toolCalls} />
                          )}
                        </AnimatePresence>

                        {/* Streaming AI response */}
                        {isStreaming && streamingContent && (
                          <ChatMessage
                            message={{
                              id: 'streaming',
                              sessionId: currentSessionId || '',
                              role: 'assistant',
                              content: streamingContent,
                              createdAt: new Date().toISOString(),
                            }}
                            isStreaming
                          />
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                      </div>
                    </div>

                    {/* Scroll to bottom button */}
                    <AnimatePresence>
                      {showScrollBtn && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute bottom-24 right-8 z-10"
                        >
                          <Button
                            size="icon"
                            onClick={scrollToBottom}
                            className="rounded-full h-9 w-9 shadow-lg border border-border bg-card/90 backdrop-blur-sm hover:bg-card"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Chat input */}
                    <ChatInput
                      onSend={handleSendMessage}
                      onStop={handleStopStreaming}
                      disabled={isStreaming}
                      isStreaming={isStreaming}
                    >
                      {/* Image upload button */}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl flex-shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isStreaming}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </Button>
                    </ChatInput>

                    {/* Image previews */}
                    {attachedImages.length > 0 && (
                      <div className="max-w-3xl mx-auto flex gap-2 px-4 pb-2 flex-wrap">
                        {attachedImages.map((img, i) => (
                          <div key={i} className="relative group rounded-lg overflow-hidden border border-border w-20 h-20">
                            <img src={img} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              onClick={() => removeImage(i)}
                              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'files' && (
                  <motion.div
                    key="files"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0"
                  >
                    <WorkspacePanel
                      open={activeTab === 'files'}
                      onToggle={() => setActiveTab(activeTab === 'files' ? 'chat' : 'files')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <EmptyState onNewChat={handleNewChat} />
        )}
      </main>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSession}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AppContent />
    </ThemeProvider>
  );
}
