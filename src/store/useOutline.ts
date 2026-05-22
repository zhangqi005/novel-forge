import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { OutlineNode, Storyline } from '@/types';
import * as db from '@/lib/db';

interface OutlineStore {
  outlineNodes: OutlineNode[];
  storylines: Storyline[];
  selectedNodeId: string | null;
  isLoaded: boolean;
  loadOutlines: (workId: string) => Promise<void>;
  loadStorylines: (workId: string) => Promise<void>;
  selectNode: (id: string | null) => void;
  addNode: (workId: string, parentId: string | null, type: OutlineNode['type']) => Promise<OutlineNode>;
  updateNode: (node: OutlineNode) => Promise<void>;
  removeNode: (id: string) => Promise<void>;
  reorderNode: (nodeId: string, newParentId: string | null, newIndex: number) => Promise<void>;
  addStoryline: (workId: string) => Promise<Storyline>;
  updateStoryline: (sl: Storyline) => Promise<void>;
  removeStoryline: (id: string) => Promise<void>;
}

export const useOutline = create<OutlineStore>((set, get) => ({
  outlineNodes: [],
  storylines: [],
  selectedNodeId: null,
  isLoaded: false,

  loadOutlines: async (workId) => {
    const nodes = await db.getOutlinesByWork(workId);
    set({ outlineNodes: nodes, isLoaded: true });
  },

  loadStorylines: async (workId) => {
    const sls = await db.getStorylinesByWork(workId);
    set({ storylines: sls });
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  addNode: async (workId, parentId, type) => {
    const siblings = get().outlineNodes.filter((n) => n.parentId === parentId);
    const node: OutlineNode = {
      id: uuidv4(),
      workId,
      parentId,
      type,
      title: type === 'volume' ? '新卷' : type === 'chapter' ? '新章节' : '新场景',
      summary: '',
      order: siblings.length,
      storylines: [],
      foreshadows: [],
      status: 'planned',
    };
    await db.saveOutline(node);
    set((s) => ({ outlineNodes: [...s.outlineNodes, node], selectedNodeId: node.id }));
    return node;
  },

  updateNode: async (node) => {
    await db.saveOutline(node);
    set((s) => ({
      outlineNodes: s.outlineNodes.map((n) => (n.id === node.id ? node : n)),
    }));
  },

  removeNode: async (id) => {
    await db.deleteOutline(id);
    const descendants = getDescendantIds(get().outlineNodes, id);
    for (const did of descendants) {
      await db.deleteOutline(did);
    }
    set((s) => ({
      outlineNodes: s.outlineNodes.filter((n) => n.id !== id && !descendants.has(n.id)),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
  },

  reorderNode: async (nodeId, newParentId, newIndex) => {
    const { outlineNodes } = get();
    const node = outlineNodes.find((n) => n.id === nodeId);
    if (!node) return;

    const siblings = outlineNodes
      .filter((n) => n.parentId === newParentId && n.id !== nodeId)
      .sort((a, b) => a.order - b.order);

    const reordered: OutlineNode[] = [];
    for (const sibling of siblings) {
      if (reordered.length === newIndex) {
        reordered.push({ ...node, parentId: newParentId, order: newIndex });
      }
      reordered.push({ ...sibling, order: reordered.length });
    }
    if (reordered.length <= newIndex) {
      reordered.push({ ...node, parentId: newParentId, order: reordered.length });
    }

    await Promise.all(reordered.map((n) => db.saveOutline(n)));

    set((s) => ({
      outlineNodes: s.outlineNodes.map((n) => {
        const updated = reordered.find((r) => r.id === n.id);
        return updated || n;
      }),
    }));
  },

  addStoryline: async (workId) => {
    const sl: Storyline = {
      id: uuidv4(),
      workId,
      name: '新故事线',
      type: 'custom',
      color: '#c9a96e',
      description: '',
      nodes: [],
    };
    await db.saveStoryline(sl);
    set((s) => ({ storylines: [...s.storylines, sl] }));
    return sl;
  },

  updateStoryline: async (sl) => {
    await db.saveStoryline(sl);
    set((s) => ({
      storylines: s.storylines.map((l) => (l.id === sl.id ? sl : l)),
    }));
  },

  removeStoryline: async (id) => {
    await db.deleteStoryline(id);
    set((s) => ({ storylines: s.storylines.filter((l) => l.id !== id) }));
  },
}));

function getDescendantIds(nodes: OutlineNode[], parentId: string): Set<string> {
  const result = new Set<string>();
  const children = nodes.filter((n) => n.parentId === parentId);
  for (const child of children) {
    result.add(child.id);
    for (const desc of getDescendantIds(nodes, child.id)) {
      result.add(desc);
    }
  }
  return result;
}
