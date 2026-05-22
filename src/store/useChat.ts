import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/types';

interface EditContext {
  originalText: string;
  action: string;
}

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  abortController: AbortController | null;
  editContext: EditContext | null;
  addMessage: (role: 'user' | 'assistant', content: string) => ChatMessage;
  updateLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  setEditContext: (ctx: EditContext | null) => void;
  clearMessages: () => void;
}

export const useChat = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  abortController: null,
  editContext: null,

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

  setEditContext: (ctx) => set({ editContext: ctx }),

  clearMessages: () => set({ messages: [], editContext: null }),
}));

// Parse AI response to extract suggested text
export function parseSuggestedText(response: string): string | null {
  // Try ``` code blocks first
  const codeBlock = response.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
  if (codeBlock) return codeBlock[1].trim();

  // Try "修改为：" or "改为：" patterns
  const afterColon = response.match(/(?:修改为|改为|建议改为)[：:]\s*\n?([\s\S]{20,}?)(?:\n\n|$)/);
  if (afterColon) return afterColon[1].trim();

  // Try "修改后" patterns
  const afterMod = response.match(/修改后[^：:]*[：:]\s*\n?([\s\S]{20,}?)(?:\n\n|$)/);
  if (afterMod) return afterMod[1].trim();

  // If there's a clear text block that looks like prose (has multiple sentences)
  const proseBlock = response.match(/([""][\s\S]+?[""])/);
  if (proseBlock) return proseBlock[1].replace(/[""]/g, '').trim();

  return null;
}
