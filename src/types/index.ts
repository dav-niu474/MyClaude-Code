export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
}

export interface Session {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string | null;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  result?: string;
}

export interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  toolCalls: ToolCall[];
  activeToolName: string | null;
}
