import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character, Monster } from '../types';

// ============================================================
// TYPES DU STORE
// ============================================================

interface CharactersState {
  // --- STATE ---
  characters: Character[];
  monsters: Monster[];
  selectedCharacter: Character | null;
  selectedMonster: Monster | null;

  // --- ACTIONS PERSONNAGES ---
  addCharacter: (character: Omit<Character, 'id'>) => void;
  updateCharacter: (id: string, changes: Partial<Omit<Character, 'id'>>) => void;
  deleteCharacter: (id: string) => void;
  selectCharacter: (character: Character | null) => void;

  // Raccourci pour mettre à jour les HP sans toucher au reste
  updateCharacterHp: (id: string, current: number, temp?: number) => void;

  // --- ACTIONS MONSTRES ---
  addMonster: (monster: Omit<Monster, 'id'>) => void;
  updateMonster: (id: string, changes: Partial<Omit<Monster, 'id'>>) => void;
  deleteMonster: (id: string) => void;
  selectMonster: (monster: Monster | null) => void;
}

// ============================================================
// STORE
// ============================================================

export const useCharactersStore = create<CharactersState>()(
  persist(
    (set) => ({
      // Valeurs par défaut
      characters: [],
      monsters: [],
      selectedCharacter: null,
      selectedMonster: null,

      // ── PERSONNAGES ───────────────────────────────────────

      addCharacter: (character) =>
        set((state) => ({
          characters: [...state.characters, { ...character, id: crypto.randomUUID() }],
        })),

      updateCharacter: (id, changes) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === id ? { ...c, ...changes } : c)),
          selectedCharacter:
            state.selectedCharacter?.id === id
              ? { ...state.selectedCharacter, ...changes }
              : state.selectedCharacter,
        })),

      deleteCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
          selectedCharacter: state.selectedCharacter?.id === id ? null : state.selectedCharacter,
        })),

      selectCharacter: (character) => set({ selectedCharacter: character }),

      // Met à jour uniquement les HP — utile pendant le combat
      updateCharacterHp: (id, current, temp) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id
              ? {
                  ...c,
                  hp: {
                    current,
                    max: c.hp?.max ?? current,
                    temp: temp ?? c.hp?.temp,
                  },
                }
              : c
          ),
          selectedCharacter:
            state.selectedCharacter?.id === id
              ? {
                  ...state.selectedCharacter,
                  hp: {
                    current,
                    max: state.selectedCharacter.hp?.max ?? current,
                    temp: temp ?? state.selectedCharacter.hp?.temp,
                  },
                }
              : state.selectedCharacter,
        })),

      // ── MONSTRES ──────────────────────────────────────────

      addMonster: (monster) =>
        set((state) => ({
          monsters: [...state.monsters, { ...monster, id: crypto.randomUUID() }],
        })),

      updateMonster: (id, changes) =>
        set((state) => ({
          monsters: state.monsters.map((m) => (m.id === id ? { ...m, ...changes } : m)),
          selectedMonster:
            state.selectedMonster?.id === id
              ? { ...state.selectedMonster, ...changes }
              : state.selectedMonster,
        })),

      deleteMonster: (id) =>
        set((state) => ({
          monsters: state.monsters.filter((m) => m.id !== id),
          selectedMonster: state.selectedMonster?.id === id ? null : state.selectedMonster,
        })),

      selectMonster: (monster) => set({ selectedMonster: monster }),
    }),
    {
      name: 'dm-companion-characters',
    }
  )
);
