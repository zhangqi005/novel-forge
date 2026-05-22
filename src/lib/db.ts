import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Work, Chapter, CharacterCard, OutlineNode, Storyline } from '@/types';

interface NovelForgeDB extends DBSchema {
  works: {
    key: string;
    value: Work;
  };
  chapters: {
    key: string;
    value: Chapter;
    indexes: { 'by-work': string };
  };
  characters: {
    key: string;
    value: CharacterCard;
    indexes: { 'by-work': string };
  };
  outlines: {
    key: string;
    value: OutlineNode;
    indexes: { 'by-work': string };
  };
  storylines: {
    key: string;
    value: Storyline;
    indexes: { 'by-work': string };
  };
}

let dbPromise: Promise<IDBPDatabase<NovelForgeDB>> | null = null;

function getDB(): Promise<IDBPDatabase<NovelForgeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NovelForgeDB>('novel-forge', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('works')) {
          db.createObjectStore('works', { keyPath: 'id' });
        }
        const chapterStore = db.createObjectStore('chapters', { keyPath: 'id' });
        if (!chapterStore.indexNames.contains('by-work')) {
          chapterStore.createIndex('by-work', 'workId');
        }

        const charStore = db.createObjectStore('characters', { keyPath: 'id' });
        if (!charStore.indexNames.contains('by-work')) {
          charStore.createIndex('by-work', 'workId');
        }

        const outlineStore = db.createObjectStore('outlines', { keyPath: 'id' });
        if (!outlineStore.indexNames.contains('by-work')) {
          outlineStore.createIndex('by-work', 'workId');
        }

        const storylineStore = db.createObjectStore('storylines', { keyPath: 'id' });
        if (!storylineStore.indexNames.contains('by-work')) {
          storylineStore.createIndex('by-work', 'workId');
        }
      },
    });
  }
  return dbPromise;
}

// Works
export async function getAllWorks(): Promise<Work[]> {
  return (await getDB()).getAll('works');
}

export async function getWork(id: string): Promise<Work | undefined> {
  return (await getDB()).get('works', id);
}

export async function saveWork(work: Work): Promise<void> {
  await (await getDB()).put('works', work);
}

export async function deleteWork(id: string): Promise<void> {
  await (await getDB()).delete('works', id);
}

// Chapters
export async function getChaptersByWork(workId: string): Promise<Chapter[]> {
  return (await getDB()).getAllFromIndex('chapters', 'by-work', workId);
}

export async function getChapter(id: string): Promise<Chapter | undefined> {
  return (await getDB()).get('chapters', id);
}

export async function saveChapter(chapter: Chapter): Promise<void> {
  await (await getDB()).put('chapters', chapter);
}

export async function deleteChapter(id: string): Promise<void> {
  await (await getDB()).delete('chapters', id);
}

// Characters
export async function getCharactersByWork(workId: string): Promise<CharacterCard[]> {
  return (await getDB()).getAllFromIndex('characters', 'by-work', workId);
}

export async function getCharacter(id: string): Promise<CharacterCard | undefined> {
  return (await getDB()).get('characters', id);
}

export async function saveCharacter(ch: CharacterCard): Promise<void> {
  await (await getDB()).put('characters', ch);
}

export async function deleteCharacter(id: string): Promise<void> {
  await (await getDB()).delete('characters', id);
}

// Outlines
export async function getOutlinesByWork(workId: string): Promise<OutlineNode[]> {
  return (await getDB()).getAllFromIndex('outlines', 'by-work', workId);
}

export async function saveOutline(node: OutlineNode): Promise<void> {
  await (await getDB()).put('outlines', node);
}

export async function deleteOutline(id: string): Promise<void> {
  await (await getDB()).delete('outlines', id);
}

// Storylines
export async function getStorylinesByWork(workId: string): Promise<Storyline[]> {
  return (await getDB()).getAllFromIndex('storylines', 'by-work', workId);
}

export async function saveStoryline(sl: Storyline): Promise<void> {
  await (await getDB()).put('storylines', sl);
}

export async function deleteStoryline(id: string): Promise<void> {
  await (await getDB()).delete('storylines', id);
}
