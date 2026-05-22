import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CharacterCard } from '@/types';
import * as db from '@/lib/db';

interface CharacterStore {
  characters: CharacterCard[];
  selectedId: string | null;
  isLoaded: boolean;
  loadCharacters: (workId: string) => Promise<void>;
  selectCharacter: (id: string | null) => void;
  addCharacter: (workId: string) => Promise<CharacterCard>;
  updateCharacter: (character: CharacterCard) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;
}

export const useCharacters = create<CharacterStore>((set, get) => ({
  characters: [],
  selectedId: null,
  isLoaded: false,

  loadCharacters: async (workId) => {
    const chars = await db.getCharactersByWork(workId);
    set({ characters: chars, isLoaded: true });
  },

  selectCharacter: (id) => set({ selectedId: id }),

  addCharacter: async (workId) => {
    const newChar: CharacterCard = {
      id: uuidv4(),
      workId,
      name: '未命名角色',
      aliases: [],
      role: 'supporting',
      attributes: {
        age: 0,
        gender: '',
        appearance: '',
        personality: '',
        background: '',
        abilities: [],
        quirks: [],
      },
      characterArc: '',
      relationships: [],
      relatedChapterIds: [],
    };
    await db.saveCharacter(newChar);
    set((s) => ({ characters: [...s.characters, newChar], selectedId: newChar.id }));
    return newChar;
  },

  updateCharacter: async (ch) => {
    await db.saveCharacter(ch);
    set((s) => ({
      characters: s.characters.map((c) => (c.id === ch.id ? ch : c)),
    }));
  },

  removeCharacter: async (id) => {
    await db.deleteCharacter(id);
    set((s) => ({
      characters: s.characters.filter((c) => c.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },
}));
