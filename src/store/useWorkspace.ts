import { create } from 'zustand';
import type { WorkspaceState, PanelView, AIMode } from '@/types';

interface WorkspaceStore extends WorkspaceState {
  setCurrentWork: (id: string | null) => void;
  setCurrentChapter: (id: string | null) => void;
  setLeftPanelView: (view: PanelView) => void;
  setChatMode: (mode: AIMode) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
}

export const useWorkspace = create<WorkspaceStore>((set) => ({
  currentWorkId: null,
  currentChapterId: null,
  leftPanelView: 'chapters',
  chatMode: 'execution',
  leftPanelWidth: 280,
  rightPanelWidth: 360,

  setCurrentWork: (id) => set({ currentWorkId: id }),
  setCurrentChapter: (id) => set({ currentChapterId: id }),
  setLeftPanelView: (view) => set({ leftPanelView: view }),
  setChatMode: (mode) => set({ chatMode: mode }),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.max(200, Math.min(480, width)) }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: Math.max(300, Math.min(600, width)) }),
}));
