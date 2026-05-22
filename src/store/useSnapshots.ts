import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { WritingSnapshot } from '@/types';

interface SnapshotStore {
  snapshots: Map<string, WritingSnapshot[]>;  // chapterId -> snapshots
  getSnapshots: (chapterId: string) => WritingSnapshot[];
  saveSnapshot: (chapterId: string, content: Record<string, unknown>, label?: string) => void;
  deleteSnapshot: (chapterId: string, snapshotId: string) => void;
}

export const useSnapshots = create<SnapshotStore>((set, get) => ({
  snapshots: new Map(),

  getSnapshots: (chapterId) => {
    return get().snapshots.get(chapterId) || [];
  },

  saveSnapshot: (chapterId, content, label) => {
    const snapshot: WritingSnapshot = {
      id: uuidv4(),
      chapterId,
      content,
      version: (get().snapshots.get(chapterId)?.length || 0) + 1,
      source: 'manual',
      prompt: label,
      createdAt: new Date(),
    };

    set((s) => {
      const updated = new Map(s.snapshots);
      const existing = updated.get(chapterId) || [];
      updated.set(chapterId, [snapshot, ...existing].slice(0, 50)); // keep max 50
      return { snapshots: updated };
    });
  },

  deleteSnapshot: (chapterId, snapshotId) => {
    set((s) => {
      const updated = new Map(s.snapshots);
      const existing = updated.get(chapterId) || [];
      updated.set(chapterId, existing.filter((sn) => sn.id !== snapshotId));
      return { snapshots: updated };
    });
  },
}));
