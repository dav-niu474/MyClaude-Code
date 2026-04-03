'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
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
import { Session, Message } from '@/types';
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

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { theme, setTheme } = useSettingsStore();
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const [localTheme, setLocalTheme] = useState(theme);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setLocalTheme(newTheme);
    setTheme(newTheme);
    if (newTheme === 'system') {
      setNextTheme('system');
    } else {
      setNextTheme(newTheme);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize your MyClaude Code experience</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Appearance</h4>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppContent() {
  const {
    user, isAuthenticated, isLoading, logout
  } = useAuthStore();
  const {
    sessions, currentSessionId, messages, isStreaming, streamingContent,
    setSessions, setCurrentSession, addSession, removeSession,
    setStreaming, setStreamingContent, appendStreamingContent, addMessage, reset,
  } = useChatStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, streamingContent]);

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

  const handleSendMessage = async (content: string) => {
    if (!currentSessionId) {
      // Auto-create session
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
          // Now send message with the new session ID
          await sendMessageWithSession(data.session.id, content);
        }
      } catch (error) {
        console.error('Failed to create session:', error);
      }
      return;
    }

    await sendMessageWithSession(currentSessionId, content);
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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

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
    }
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setStreaming(false);
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
            <Badge variant="outline" className="text-xs font-normal gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </Badge>
          </div>
        </div>

        {/* Chat Area */}
        {currentSessionId || messages.length > 0 ? (
          <>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto">
                {messages.map((msg: Message) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
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

            <ChatInput
              onSend={handleSendMessage}
              onStop={handleStopStreaming}
              disabled={isStreaming}
              isStreaming={isStreaming}
            />
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
