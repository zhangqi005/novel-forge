import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Discussion, DiscussionMessage, AgentPersona } from '@/types';
import { PRESET_AGENTS } from '@/lib/ai';

interface DiscussionStore {
  discussions: Discussion[];
  currentDiscussionId: string | null;
  activeAgents: AgentPersona[];
  isGenerating: boolean;
  createDiscussion: (workId: string, topic: string) => Discussion;
  selectDiscussion: (id: string | null) => void;
  addMessage: (discussionId: string, agentId: string, content: string) => void;
  toggleAgent: (agentId: string) => void;
  setGenerating: (v: boolean) => void;
  removeDiscussion: (id: string) => void;
}

export const useDiscussion = create<DiscussionStore>((set, get) => ({
  discussions: [],
  currentDiscussionId: null,
  activeAgents: PRESET_AGENTS.slice(0, 3),
  isGenerating: false,

  createDiscussion: (workId, topic) => {
    const disc: Discussion = {
      id: uuidv4(),
      workId,
      topic,
      messages: [],
      agents: get().activeAgents.map((a) => a.id),
    };
    set((s) => ({
      discussions: [...s.discussions, disc],
      currentDiscussionId: disc.id,
    }));
    return disc;
  },

  selectDiscussion: (id) => set({ currentDiscussionId: id }),

  addMessage: (discussionId, agentId, content) => {
    const msg: DiscussionMessage = {
      id: uuidv4(),
      agentId,
      content,
      timestamp: new Date(),
    };
    set((s) => ({
      discussions: s.discussions.map((d) =>
        d.id === discussionId ? { ...d, messages: [...d.messages, msg] } : d,
      ),
    }));
  },

  toggleAgent: (agentId) => {
    set((s) => {
      const isActive = s.activeAgents.some((a) => a.id === agentId);
      if (isActive) {
        return { activeAgents: s.activeAgents.filter((a) => a.id !== agentId) };
      }
      const agent = PRESET_AGENTS.find((a) => a.id === agentId);
      return agent ? { activeAgents: [...s.activeAgents, agent] } : {};
    });
  },

  setGenerating: (v) => set({ isGenerating: v }),

  removeDiscussion: (id) => {
    set((s) => ({
      discussions: s.discussions.filter((d) => d.id !== id),
      currentDiscussionId: s.currentDiscussionId === id ? null : s.currentDiscussionId,
    }));
  },
}));
