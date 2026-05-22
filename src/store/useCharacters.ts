import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CharacterCard, Relationship } from '@/types';
import * as db from '@/lib/db';
import { extractCharactersFromChapters } from '@/lib/characterExtraction';

interface CharacterStore {
  characters: CharacterCard[];
  selectedId: string | null;
  isLoaded: boolean;
  isExtracting: boolean;
  loadCharacters: (workId: string) => Promise<void>;
  selectCharacter: (id: string | null) => void;
  addCharacter: (workId: string) => Promise<CharacterCard>;
  updateCharacter: (character: CharacterCard) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;
  extractFromChapters: (workId: string, chaptersText: string) => Promise<string>;
}

export const useCharacters = create<CharacterStore>((set, get) => ({
  characters: [],
  selectedId: null,
  isLoaded: false,
  isExtracting: false,

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

  extractFromChapters: async (workId, chaptersText) => {
    set({ isExtracting: true });
    const { characters } = get();

    try {
      const extracted = await extractCharactersFromChapters(chaptersText, characters);

      let newCount = 0;
      let updatedCount = 0;

      for (const ext of extracted) {
        if (!ext.name) continue;

        // Match with existing character
        const existing = characters.find(
          (c) =>
            c.name === ext.name ||
            c.aliases.some((a) => a === ext.name) ||
            ext.aliases?.some((a) => c.name === a || c.aliases.includes(a)),
        );

        if (existing) {
          // Only fill empty/unknown fields
          const attrs = { ...existing.attributes };
          let attrsChanged = false;

          if (!attrs.age && ext.age) { attrs.age = ext.age; attrsChanged = true; }
          if (!attrs.gender && ext.gender) { attrs.gender = ext.gender; attrsChanged = true; }
          if (!attrs.appearance && ext.appearance) { attrs.appearance = ext.appearance; attrsChanged = true; }
          if (!attrs.personality && ext.personality) { attrs.personality = ext.personality; attrsChanged = true; }
          if (!attrs.background && ext.background) { attrs.background = ext.background; attrsChanged = true; }
          if (attrs.abilities.length === 0 && ext.abilities?.length) { attrs.abilities = ext.abilities; attrsChanged = true; }
          if (attrs.quirks.length === 0 && ext.quirks?.length) { attrs.quirks = ext.quirks; attrsChanged = true; }

          const updates: Partial<CharacterCard> = {};
          if (attrsChanged) updates.attributes = attrs;
          if (!existing.characterArc && ext.characterArc) { updates.characterArc = ext.characterArc; }
          if (existing.aliases.length === 0 && ext.aliases?.length) {
            updates.aliases = ext.aliases.filter((a) => a !== ext.name && !existing.aliases.includes(a));
          }
          if (existing.role === 'supporting' && ext.role && ['protagonist', 'antagonist', 'supporting', 'cameo'].includes(ext.role)) {
            updates.role = ext.role as CharacterCard['role'];
          }

          if (Object.keys(updates).length > 0) {
            const updated = { ...existing, ...updates };
            await db.saveCharacter(updated);
            set((s) => ({
              characters: s.characters.map((c) => (c.id === updated.id ? updated : c)),
            }));
            updatedCount++;
          }
        } else {
          // Create new character
          const newChar: CharacterCard = {
            id: uuidv4(),
            workId,
            name: ext.name,
            aliases: ext.aliases || [],
            role: (['protagonist', 'antagonist', 'supporting', 'cameo'].includes(ext.role || '')
              ? ext.role
              : 'supporting') as CharacterCard['role'],
            attributes: {
              age: ext.age || 0,
              gender: ext.gender || '',
              appearance: ext.appearance || '',
              personality: ext.personality || '',
              background: ext.background || '',
              abilities: ext.abilities || [],
              quirks: ext.quirks || [],
            },
            characterArc: ext.characterArc || '',
            relationships: [],
            relatedChapterIds: [],
          };
          await db.saveCharacter(newChar);
          set((s) => ({ characters: [...s.characters, newChar] }));
          newCount++;
        }
      }

      // Second pass: resolve relationships
      const currentChars = get().characters;
      for (const ext of extracted) {
        if (!ext.relationships?.length) continue;
        const sourceChar = currentChars.find(
          (c) => c.name === ext.name || c.aliases.some((a) => a === ext.name),
        );
        if (!sourceChar) continue;

        let relsChanged = false;
        const newRels = [...sourceChar.relationships];

        for (const rel of ext.relationships) {
          const targetChar = currentChars.find(
            (c) => c.name === rel.targetName || c.aliases.some((a) => a === rel.targetName),
          );
          if (!targetChar || targetChar.id === sourceChar.id) continue;

          const exists = newRels.some((r) => r.targetCharacterId === targetChar.id);
          if (!exists) {
            newRels.push({
              targetCharacterId: targetChar.id,
              type: rel.type || '其他',
              description: rel.description || '',
            });
            relsChanged = true;
          }
        }

        if (relsChanged) {
          const updated = { ...sourceChar, relationships: newRels };
          await db.saveCharacter(updated);
          set((s) => ({
            characters: s.characters.map((c) => (c.id === updated.id ? updated : c)),
          }));
        }
      }

      set({ isExtracting: false });

      const parts: string[] = [];
      if (newCount > 0) parts.push(`新增${newCount}个角色`);
      if (updatedCount > 0) parts.push(`补充${updatedCount}个已有角色`);
      return parts.length > 0 ? parts.join('，') : '未发现新的角色信息';
    } catch {
      set({ isExtracting: false });
      return '提取失败，请重试';
    }
  },
}));
