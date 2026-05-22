import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Work, Chapter } from '@/types';
import * as db from '@/lib/db';

interface WorksStore {
  works: Work[];
  chapters: Chapter[];
  currentWorkId: string | null;
  currentChapterId: string | null;
  isLoaded: boolean;
  loadWorks: () => Promise<void>;
  loadChapters: (workId: string) => Promise<void>;
  createWork: (title: string, type: Work['type'], genre: string[]) => Promise<Work>;
  deleteWork: (id: string) => Promise<void>;
  createChapter: (workId: string, title: string) => Promise<Chapter>;
  deleteChapter: (id: string) => Promise<void>;
  setCurrentWork: (id: string | null) => void;
  setCurrentChapter: (id: string | null) => void;
  updateChapterContent: (id: string, content: Record<string, unknown>, wordCount: number) => Promise<void>;
  reorderChapters: (chapterId: string, newIndex: number) => Promise<void>;
}

export const useWorks = create<WorksStore>((set, get) => ({
  works: [],
  chapters: [],
  currentWorkId: null,
  currentChapterId: null,
  isLoaded: false,

  loadWorks: async () => {
    const works = await db.getAllWorks();
    const { currentWorkId } = get();
    // Auto-select first work if none is selected
    const nextWorkId = currentWorkId ?? (works.length > 0 ? works[0].id : null);
    set({ works, isLoaded: true, currentWorkId: nextWorkId });
    // If we auto-selected a work, load its chapters too
    if (nextWorkId && !currentWorkId) {
      const chapters = await db.getChaptersByWork(nextWorkId);
      set({ chapters: chapters.sort((a, b) => a.chapterNumber - b.chapterNumber) });
    }
  },

  loadChapters: async (workId) => {
    const chapters = await db.getChaptersByWork(workId);
    set({ chapters: chapters.sort((a, b) => a.chapterNumber - b.chapterNumber) });
  },

  createWork: async (title, type, genre) => {
    const work: Work = {
      id: uuidv4(),
      title,
      type,
      genre,
      wordCount: 0,
      targetWordCount: 0,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.saveWork(work);
    set((s) => ({ works: [...s.works, work], currentWorkId: work.id }));

    // Auto-create first chapter
    const chapter: Chapter = {
      id: uuidv4(),
      workId: work.id,
      chapterNumber: 1,
      title: '第1章',
      content: {},
      wordCount: 0,
      status: 'draft',
      scenes: [],
      plotPoints: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.saveChapter(chapter);
    set((s) => ({ chapters: [chapter], currentChapterId: chapter.id }));
    return work;
  },

  deleteWork: async (id) => {
    // Delete work and all related data
    await db.deleteWork(id);
    const chapters = await db.getChaptersByWork(id);
    for (const ch of chapters) await db.deleteChapter(ch.id);
    const chars = await db.getCharactersByWork(id);
    for (const c of chars) await db.deleteCharacter(c.id);
    const outlines = await db.getOutlinesByWork(id);
    for (const o of outlines) await db.deleteOutline(o.id);
    const storylines = await db.getStorylinesByWork(id);
    for (const s of storylines) await db.deleteStoryline(s.id);
    const remaining = get().works.filter((w) => w.id !== id);
    const nextWorkId = get().currentWorkId === id ? (remaining.length > 0 ? remaining[0].id : null) : get().currentWorkId;
    // If switching to a new work, load its chapters
    if (nextWorkId && nextWorkId !== get().currentWorkId) {
      const chapters = await db.getChaptersByWork(nextWorkId);
      set({
        works: remaining,
        currentWorkId: nextWorkId,
        chapters: chapters.sort((a, b) => a.chapterNumber - b.chapterNumber),
        currentChapterId: chapters.length > 0 ? chapters[chapters.length - 1].id : null,
      });
    } else {
      set((s) => ({
        works: remaining,
        currentWorkId: nextWorkId,
        chapters: s.currentWorkId === id ? [] : s.chapters,
      }));
    }
  },

  createChapter: async (workId, title) => {
    const chapters = get().chapters;
    const chapterNumber = chapters.length + 1;
    const chapter: Chapter = {
      id: uuidv4(),
      workId,
      chapterNumber,
      title: title || `第${chapterNumber}章`,
      content: {},
      wordCount: 0,
      status: 'draft',
      scenes: [],
      plotPoints: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.saveChapter(chapter);
    set((s) => ({
      chapters: [...s.chapters, chapter],
      currentChapterId: chapter.id,
    }));
    return chapter;
  },

  deleteChapter: async (id) => {
    await db.deleteChapter(id);
    set((s) => ({
      chapters: s.chapters.filter((ch) => ch.id !== id),
      currentChapterId: s.currentChapterId === id ? null : s.currentChapterId,
    }));
  },

  setCurrentWork: (id) => set({ currentWorkId: id }),
  setCurrentChapter: (id) => set({ currentChapterId: id }),

  updateChapterContent: async (id, content, wordCount) => {
    const chapter = get().chapters.find((ch) => ch.id === id);
    if (!chapter) return;
    const updated = { ...chapter, content, wordCount, updatedAt: new Date() };
    await db.saveChapter(updated);
    set((s) => ({
      chapters: s.chapters.map((ch) => (ch.id === id ? updated : ch)),
    }));
  },

  reorderChapters: async (chapterId, newIndex) => {
    const { chapters } = get();
    const chapter = chapters.find((ch) => ch.id === chapterId);
    if (!chapter) return;

    const sorted = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    const oldIndex = sorted.findIndex((ch) => ch.id === chapterId);
    if (oldIndex === -1) return;

    // Remove from old position and insert at new position
    sorted.splice(oldIndex, 1);
    sorted.splice(newIndex, 0, chapter);

    // Reassign chapterNumbers
    const updated = sorted.map((ch, i) => ({ ...ch, chapterNumber: i + 1 }));

    await Promise.all(updated.map((ch) => db.saveChapter(ch)));
    set({ chapters: updated });
  },
}));
