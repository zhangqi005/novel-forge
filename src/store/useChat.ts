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
  // Try ``` code blocks first (with or without language tag, flexible whitespace)
  const codeBlock = response.match(/```[\s\S]*?\n([\s\S]*?)\n\s*```/);
  if (codeBlock) return codeBlock[1].trim();

  // Try "润色后/修改后/扩写后/精简后/重写后/版本" followed by colon
  const afterLabel = response.match(/(?:润色后|修改后|扩写后|精简后|重写后|版本[一二三四五]|建议版本)[^：:]*[：:]\s*\n?([\s\S]{20,}?)(?:\n\n(?:---|说明|改动|修改|[以主]|除此|另外|同时|注意|P\\.?S\\.|总[之结])|$)/);
  if (afterLabel) return afterLabel[1].trim();

  // Try "修改为/改为/建议改为" patterns
  const afterColon = response.match(/(?:修改为|改为|建议改为)[：:]\s*\n?([\s\S]{20,}?)(?:\n\n(?:---|说明|改动|修改|[以主]|除此|另外|同时|注意|P\\.?S\\.|总[之结])|$)/);
  if (afterColon) return afterColon[1].trim();

  // Try text inside Chinese quotation marks 「」 or ""
  const quotedBlock = response.match(/([""「」][\s\S]+?[""「」])/);
  if (quotedBlock) return quotedBlock[1].replace(/[""「」]/g, '').trim();

  // Fallback: extract the longest paragraph (at least 40 chars of continuous Chinese text)
  const paragraphs = response.split(/\n\n+/);
  let longest = '';
  for (const p of paragraphs) {
    const cleaned = p.replace(/^#{1,3}\s+|^>\s+|^[-*]\s+|^\d+\.\s+/gm, '').trim();
    if (cleaned.length > longest.length && !/^(?:说明|改动|修改|建议|总结|分析)/.test(cleaned)) {
      longest = cleaned;
    }
  }
  if (longest.length >= 40) return longest;

  return null;
}
