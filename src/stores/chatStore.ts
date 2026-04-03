import { create } from 'zustand';
import { Session, Message } from '@/types';

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;

  // Actions
  setSessions: (sessions: Session[]) => void;
  setCurrentSession: (sessionId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  addMessage: (message: Message) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',

  setSessions: (sessions) => set({ sessions }),

  setCurrentSession: async (sessionId) => {
    set({ currentSessionId: sessionId, messages: [], streamingContent: '' });
    if (sessionId) {
      try {
        const res = await fetch(`/api/messages?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          set({ messages: data.messages });
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    }
  },

  setMessages: (messages) => set({ messages }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions]
    })),

  removeSession: (sessionId) => {
    const state = get();
    set({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      currentSessionId:
        state.currentSessionId === sessionId ? null : state.currentSessionId,
      messages: state.currentSessionId === sessionId ? [] : state.messages,
    });
  },

  updateSessionTitle: (sessionId, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
    })),

  setStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (chunk) =>
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  reset: () => set({ messages: [], streamingContent: '', isStreaming: false }),
}));
