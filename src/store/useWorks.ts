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
}

export const useWorks = create<WorksStore>((set, get) => ({
  works: [],
  chapters: [],
  currentWorkId: null,
  currentChapterId: null,
  isLoaded: false,

  loadWorks: async () => {
    const works = await db.getAllWorks();
    set({ works, isLoaded: true });
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
    await db.deleteWork(id);
    set((s) => ({
      works: s.works.filter((w) => w.id !== id),
      currentWorkId: s.currentWorkId === id ? null : s.currentWorkId,
      chapters: s.currentWorkId === id ? [] : s.chapters,
    }));
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
}));
