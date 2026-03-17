import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Character, Monster, CombatantEntry, CombatState, Condition } from '../types';

// ============================================================
// HELPERS
// ============================================================

// Trie les combattants par initiative décroissante
// En cas d'égalité, les personnages passent avant les monstres
function sortByInitiative(combatants: CombatantEntry[]): CombatantEntry[] {
  return [...combatants].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if (a.refType === 'character' && b.refType === 'monster') return -1;
    if (a.refType === 'monster' && b.refType === 'character') return 1;
    return 0;
  });
}

// ============================================================
// TYPES DU STORE
// ============================================================

interface CombatStore {
  // --- STATE ---
  combat: CombatState;

  // --- ACTIONS — cycle de combat ---
  startCombat: (characters: Character[], monsters: Monster[]) => void;
  lockInitiative: () => void;
  endCombat: () => void;
  nextTurn: () => void;
  prevTurn: () => void;

  // --- ACTIONS — combattants ---
  addCombatant: (entry: Character | Monster, type: 'character' | 'monster') => void;
  removeCombatant: (id: string) => void;
  setInitiative: (id: string, initiative: number) => void;

  // --- ACTIONS — HP ---
  applyDamage: (id: string, amount: number) => void;
  applyHealing: (id: string, amount: number) => void;
  applyTempHp: (id: string, amount: number) => void;

  // --- ACTIONS — conditions ---
  addCondition: (id: string, condition: Condition) => void;
  removeCondition: (id: string, condition: Condition) => void;
  clearConditions: (id: string) => void;
}

// État initial — réutilisé pour le reset
const initialCombatState: CombatState = {
  isActive: false,
  round: 1,
  currentTurnIndex: 0,
  combatants: [],
};

// ============================================================
// STORE
// ============================================================

type CombatStorePersist = Pick<CombatStore, 'combat'>;

export const useCombatStore = create<CombatStore, [['zustand/persist', CombatStorePersist]]>(
  persist(
    (set, get) => ({
      combat: initialCombatState,

      // ── CYCLE DE COMBAT ───────────────────────────────────

      // Crée les combattants avec initiative à 0 — pas encore actif
      startCombat: (characters, monsters) => {
        const combatants = [
          ...characters.map((character) => ({
            id: crypto.randomUUID(),
            refId: character.id,
            refType: 'character' as const,
            name: character.name,
            initiative: 0,
            hp: {
              current: character.hp?.current ?? 0,
              max: character.hp?.max ?? 0,
              temp: character.hp?.temp,
            },
            ac: character.ac ?? 10,
            conditions: [],
          })),
          ...monsters.map((monster) => ({
            id: crypto.randomUUID(),
            refId: monster.id,
            refType: 'monster' as const,
            name: monster.name,
            initiative: 0,
            hp: {
              current: monster.hp.average,
              max: monster.hp.average,
            },
            ac: monster.ac.value,
            conditions: [],
          })),
        ];
        set({
          combat: {
            isActive: false, // on attend que les initiatives soient rentrées
            round: 1,
            currentTurnIndex: 0,
            combatants,
          },
        });
      },

      // Trie par initiative et démarre vraiment le combat
      lockInitiative: () => {
        const { combat } = get();
        const combatants = sortByInitiative(combat.combatants);
        set({
          combat: {
            ...combat,
            combatants,
            isActive: true,
            currentTurnIndex: 0,
          },
        });
      },

      // Remet tout à zéro
      endCombat: () => set({ combat: initialCombatState }),

      // Passe au combattant suivant
      nextTurn: () => {
        const { combat } = get();
        const total = combat.combatants.length;
        if (total === 0) return;
        const isLastTurn = combat.currentTurnIndex === total - 1;
        set({
          combat: {
            ...combat,
            currentTurnIndex: isLastTurn ? 0 : combat.currentTurnIndex + 1,
            round: isLastTurn ? combat.round + 1 : combat.round,
          },
        });
      },

      // Revient au combattant précédent
      prevTurn: () => {
        const { combat } = get();
        const total = combat.combatants.length;
        if (total === 0) return;
        const isFirstTurn = combat.currentTurnIndex === 0;
        set({
          combat: {
            ...combat,
            currentTurnIndex: isFirstTurn ? total - 1 : combat.currentTurnIndex - 1,
            round: isFirstTurn && combat.round > 1 ? combat.round - 1 : combat.round,
          },
        });
      },

      // ── COMBATTANTS ───────────────────────────────────────

      // Ajoute un combattant en cours de combat (renfort, invocation...)
      addCombatant: (entry, type) => {
        const { combat } = get();
        const newCombatant: CombatantEntry =
          type === 'character'
            ? (() => {
                const c = entry as Character;
                return {
                  id: crypto.randomUUID(),
                  refId: c.id,
                  refType: 'character' as const,
                  name: c.name,
                  initiative: 0,
                  hp: {
                    current: c.hp?.current ?? 0,
                    max: c.hp?.max ?? 0,
                    temp: c.hp?.temp,
                  },
                  ac: c.ac ?? 10,
                  conditions: [],
                };
              })()
            : (() => {
                const m = entry as Monster;
                return {
                  id: crypto.randomUUID(),
                  refId: m.id,
                  refType: 'monster' as const,
                  name: m.name,
                  initiative: 0,
                  hp: {
                    current: m.hp.average,
                    max: m.hp.average,
                  },
                  ac: m.ac.value,
                  conditions: [],
                };
              })();

        const combatants = combat.isActive
          ? sortByInitiative([...combat.combatants, newCombatant])
          : [...combat.combatants, newCombatant];

        set({ combat: { ...combat, combatants } });
      },

      // Retire un combattant — ajuste l'index si nécessaire
      removeCombatant: (id) => {
        const { combat } = get();
        const idx = combat.combatants.findIndex((c) => c.id === id);
        const combatants = combat.combatants.filter((c) => c.id !== id);
        const currentTurnIndex =
          idx < combat.currentTurnIndex
            ? Math.max(0, combat.currentTurnIndex - 1)
            : Math.min(combat.currentTurnIndex, combatants.length - 1);
        set({ combat: { ...combat, combatants, currentTurnIndex } });
      },

      // Modifie l'initiative d'un combattant
      // Si le combat est actif on retrie, sinon on laisse l'ordre tel quel
      setInitiative: (id, initiative) => {
        const { combat } = get();
        const updated = combat.combatants.map((c) => (c.id === id ? { ...c, initiative } : c));
        const combatants = combat.isActive ? sortByInitiative(updated) : updated;
        set({ combat: { ...combat, combatants } });
      },

      // ── HP ────────────────────────────────────────────────

      // Applique des dégâts — absorbe d'abord les HP temporaires
      applyDamage: (id, amount) => {
        const { combat } = get();
        set({
          combat: {
            ...combat,
            combatants: combat.combatants.map((c) => {
              if (c.id !== id) return c;
              const temp = c.hp.temp ?? 0;
              const damageToTemp = Math.min(temp, amount);
              const damageToHp = amount - damageToTemp;
              return {
                ...c,
                hp: {
                  ...c.hp,
                  temp: temp - damageToTemp || undefined,
                  current: Math.max(0, c.hp.current - damageToHp),
                },
              };
            }),
          },
        });
      },

      // Soigne — ne dépasse pas le max
      applyHealing: (id, amount) => {
        const { combat } = get();
        set({
          combat: {
            ...combat,
            combatants: combat.combatants.map((c) =>
              c.id === id
                ? {
                    ...c,
                    hp: {
                      ...c.hp,
                      current: Math.min(c.hp.max, c.hp.current + amount),
                    },
                  }
                : c
            ),
          },
        });
      },

      // Ajoute des HP temporaires — prend le plus élevé (RAW DnD 5e)
      applyTempHp: (id, amount) => {
        const { combat } = get();
        set({
          combat: {
            ...combat,
            combatants: combat.combatants.map((c) =>
              c.id === id
                ? {
                    ...c,
                    hp: {
                      ...c.hp,
                      temp: Math.max(c.hp.temp ?? 0, amount),
                    },
                  }
                : c
            ),
          },
        });
      },

      // ── CONDITIONS ────────────────────────────────────────

      addCondition: (id, condition) => {
        const { combat } = get();
        set({
          combat: {
            ...combat,
            combatants: combat.combatants.map((c) =>
              c.id === id && !c.conditions?.includes(condition)
                ? { ...c, conditions: [...(c.conditions ?? []), condition] }
                : c
            ),
          },
        });
      },

      removeCondition: (id, condition) => {
        const { combat } = get();
        set({
          combat: {
            ...combat,
            combatants: combat.combatants.map((c) =>
              c.id === id
                ? {
                    ...c,
                    conditions: c.conditions?.filter((cond) => cond !== condition) ?? [],
                  }
                : c
            ),
          },
        });
      },

      clearConditions: (id) => {
        const { combat } = get();
        set({
          combat: {
            ...combat,
            combatants: combat.combatants.map((c) => (c.id === id ? { ...c, conditions: [] } : c)),
          },
        });
      },
    }),
    {
      name: 'dm-companion-combat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ combat: state.combat }),
    }
  )
);
