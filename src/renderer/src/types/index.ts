// ============================================================
// MODES & NAVIGATION
// ============================================================

export type AppMode = 'preparation' | 'game';

export type Section = 'notes' | 'music' | 'characters' | 'soundboard' | 'monsters';

// ============================================================
// STATS DnD 5e
// ============================================================

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export type DamageType =
  | 'slashing'
  | 'piercing'
  | 'bludgeoning'
  | 'fire'
  | 'cold'
  | 'lightning'
  | 'thunder'
  | 'poison'
  | 'acid'
  | 'psychic'
  | 'radiant'
  | 'necrotic'
  | 'force';

export type Alignment =
  | 'lawful good'
  | 'neutral good'
  | 'chaotic good'
  | 'lawful neutral'
  | 'true neutral'
  | 'chaotic neutral'
  | 'lawful evil'
  | 'neutral evil'
  | 'chaotic evil'
  | 'unaligned';

// ============================================================
// NOTES
// ============================================================

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  sessionId?: string;
  folderId: string | null;
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
}

// ============================================================
// CAMPAGNE & SESSION
// ============================================================

export interface Session {
  id: string;
  title: string;
  number: number;
  date: Date;
  summary?: string;
  noteIds?: string[]; // Références aux notes liées
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  sessions?: Session[];
  createdAt: Date;
  imageUrl?: string;
}

// ============================================================
// PERSONNAGES
// ============================================================

export interface Character {
  id: string;
  name: string;
  type: 'player' | 'npc';
  race?: string;
  class?: string; // Pour les PJs
  level?: number; // Pour les PJs
  abilityScores?: AbilityScores;
  hp?: {
    current: number;
    max: number;
    temp?: number;
  };
  ac?: number;
  initiative?: number; // Bonus d'initiative
  description?: string;
  imageUrl?: string;
  notes?: string;
}

// ============================================================
// MONSTRES (DnD 5e simplifié)
// ============================================================

export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

export type CreatureType =
  | 'aberration'
  | 'beast'
  | 'celestial'
  | 'construct'
  | 'dragon'
  | 'elemental'
  | 'fey'
  | 'fiend'
  | 'giant'
  | 'humanoid'
  | 'monstrosity'
  | 'ooze'
  | 'plant'
  | 'undead';

export interface Monster {
  id: string;
  name: string;
  size: CreatureSize;
  creatureType: CreatureType;
  alignment: Alignment;
  cr: number | string; // CR peut être "1/8", "1/4", "1/2" ou un entier
  // Combat
  hp: {
    average: number;
    formula: string; // ex: "4d8+4"
  };
  ac: {
    value: number;
    source?: string; // ex: "natural armor"
  };
  speed: {
    walk?: number;
    fly?: number;
    swim?: number;
    climb?: number;
    burrow?: number;
  };
  // Stats
  abilityScores: AbilityScores;
  // Résistances / Immunités
  resistances?: DamageType[];
  immunities?: DamageType[];
  // Bonus de maîtrise calculé depuis le CR
  proficiencyBonus?: number;
  // Description & visuels
  description?: string;
  imageUrl?: string;
  // Source (Manuel des Monstres, homebrew...)
  source?: string;
  isHomebrew?: boolean;
}

// ============================================================
// COMBAT (pour le mode "game")
// ============================================================

export interface CombatantEntry {
  id: string;
  refId: string; // Référence à un Character ou Monster
  refType: 'character' | 'monster';
  name: string;
  initiative: number;
  hp: {
    current: number;
    max: number;
    temp?: number;
  };
  ac: number;
  conditions?: Condition[];
}

export type Condition =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious';

export interface CombatState {
  isActive: boolean;
  round: number;
  currentTurnIndex: number;
  combatants: CombatantEntry[];
}

// ============================================================
// AUDIO
// ============================================================

export interface AudioTrack {
  id: string;
  name: string;
  path: string;
  tags?: string[];
  volume?: number;
  loop?: boolean;
  duration?: number; // en secondes
}

export interface SoundEffect {
  id: string;
  name: string;
  path: string;
  key?: string; // Raccourci clavier
  volume?: number;
}
