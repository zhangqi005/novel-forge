import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/types';

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  abortController: AbortController | null;
  addMessage: (role: 'user' | 'assistant', content: string) => ChatMessage;
  updateLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  clearMessages: () => void;
}

export const useChat = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  abortController: null,

  addMessage: (role, content) => {
    const msg: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
    return msg;
  },

  updateLastMessage: (content) => {
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: content };
      }
      return { messages: msgs };
    });
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setAbortController: (ctrl) => set({ abortController: ctrl }),

  clearMessages: () => set({ messages: [] }),
}));
