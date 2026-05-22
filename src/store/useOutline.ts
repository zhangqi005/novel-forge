import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { OutlineNode, Storyline, Foreshadow } from '@/types';
import * as db from '@/lib/db';
import { extractOutlineFromChapters } from '@/lib/outlineExtraction';

interface OutlineStore {
  outlineNodes: OutlineNode[];
  storylines: Storyline[];
  selectedNodeId: string | null;
  isLoaded: boolean;
  isExtracting: boolean;
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
  extractFromChapters: (workId: string, chaptersText: string) => Promise<string>;
}

export const useOutline = create<OutlineStore>((set, get) => ({
  outlineNodes: [],
  storylines: [],
  selectedNodeId: null,
  isLoaded: false,
  isExtracting: false,

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

  extractFromChapters: async (workId, chaptersText) => {
    set({ isExtracting: true });
    const { outlineNodes, storylines } = get();

    try {
      const existingTitles = outlineNodes.map((n) => n.title);
      const existingSLNames = storylines.map((s) => s.name);
      const result = await extractOutlineFromChapters(chaptersText, existingTitles, existingSLNames);

      if (!result) {
        set({ isExtracting: false });
        return '提取失败，请重试';
      }

      let nodeCount = 0;
      let slCount = 0;

      // Build a map of title → existing node for quick lookup
      const titleToNode = new Map<string, OutlineNode>();
      for (const n of outlineNodes) {
        titleToNode.set(n.title, n);
      }

      // Build a map of name → existing storyline
      const nameToSL = new Map<string, Storyline>();
      for (const s of storylines) {
        nameToSL.set(s.name, s);
      }

      // First pass: create/update outline nodes
      const titleToNewId = new Map<string, string>(); // maps title → new node id for parent resolution

      // Sort: process parent nodes first (volumes before chapters)
      const sortedNodes = [...result.outlineNodes].sort((a, b) => {
        const typeOrder: Record<string, number> = { volume: 0, chapter: 1, scene: 2 };
        return (typeOrder[a.type] || 2) - (typeOrder[b.type] || 2);
      });

      for (const ext of sortedNodes) {
        // Skip if already exists
        if (titleToNode.has(ext.title)) {
          titleToNewId.set(ext.title, titleToNode.get(ext.title)!.id);
          continue;
        }

        // Resolve parent
        let parentId: string | null = null;
        if (ext.parentTitle) {
          // Check in existing nodes
          const existingParent = titleToNode.get(ext.parentTitle);
          if (existingParent) {
            parentId = existingParent.id;
          } else {
            // Check in newly created nodes
            parentId = titleToNewId.get(ext.parentTitle) || null;
          }
        }

        const siblings = get().outlineNodes.filter((n) => n.parentId === parentId);

        const node: OutlineNode = {
          id: uuidv4(),
          workId,
          parentId,
          type: ext.type,
          title: ext.title,
          summary: ext.summary || '',
          order: siblings.length,
          storylines: [],
          foreshadows: (ext.foreshadows || []).map((fs: { description: string; plantedChapterTitle: string }) => ({
            id: uuidv4(),
            description: fs.description,
            plantedChapterId: '',
            status: 'planted' as const,
          })),
          status: ext.status || 'writing',
        };

        await db.saveOutline(node);
        set((s) => ({ outlineNodes: [...s.outlineNodes, node] }));
        titleToNewId.set(ext.title, node.id);
        titleToNode.set(ext.title, node);
        nodeCount++;
      }

      // Second pass: create new storylines
      const storylineColors = ['#c9a96e', '#6eb5c9', '#c96e8a', '#8ac96e', '#c98a6e', '#6e8ac9'];
      let colorIdx = storylines.length;
      for (const ext of result.storylines || []) {
        if (nameToSL.has(ext.name)) continue;

        const sl: Storyline = {
          id: uuidv4(),
          workId,
          name: ext.name,
          type: ext.type || 'custom',
          color: storylineColors[colorIdx % storylineColors.length],
          description: ext.description || '',
          nodes: [],
        };
        await db.saveStoryline(sl);
        set((s) => ({ storylines: [...s.storylines, sl] }));
        nameToSL.set(ext.name, sl);
        colorIdx++;
        slCount++;
      }

      // Third pass: assign storylines to nodes
      for (const ext of sortedNodes) {
        if (!ext.storylines?.length) continue;
        const nodeId = titleToNewId.get(ext.title) || titleToNode.get(ext.title)?.id;
        if (!nodeId) continue;

        const currentNode = get().outlineNodes.find((n) => n.id === nodeId);
        if (!currentNode) continue;

        const newSLs: string[] = [...currentNode.storylines];
        for (const slName of ext.storylines) {
          const sl = nameToSL.get(slName);
          if (sl && !newSLs.includes(sl.id)) {
            newSLs.push(sl.id);
          }
        }

        if (newSLs.length !== currentNode.storylines.length) {
          const updated = { ...currentNode, storylines: newSLs };
          await db.saveOutline(updated);
          set((s) => ({
            outlineNodes: s.outlineNodes.map((n) => (n.id === updated.id ? updated : n)),
          }));
        }
      }

      set({ isExtracting: false });

      const parts: string[] = [];
      if (nodeCount > 0) parts.push(`新增${nodeCount}个大纲节点`);
      if (slCount > 0) parts.push(`新增${slCount}条故事线`);
      return parts.length > 0 ? parts.join('，') : '大纲已是最新，未发现新内容';
    } catch {
      set({ isExtracting: false });
      return '提取失败，请重试';
    }
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
