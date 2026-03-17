import React, { useState, useMemo } from 'react';
import { GiCharacter } from 'react-icons/gi';
import { TbPlus, TbTrash, TbSearch, TbSword, TbShield } from 'react-icons/tb';
import { useCharactersStore } from '../stores/charactersStore';
import type { Character, AbilityScores } from '../types';

// ============================================================
// HELPERS
// ============================================================

function modifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

const ABILITY_LABELS: { key: keyof AbilityScores; label: string; short: string }[] = [
  { key: 'strength', label: 'Force', short: 'FOR' },
  { key: 'dexterity', label: 'Dextérité', short: 'DEX' },
  { key: 'constitution', label: 'Constitution', short: 'CON' },
  { key: 'intelligence', label: 'Intelligence', short: 'INT' },
  { key: 'wisdom', label: 'Sagesse', short: 'SAG' },
  { key: 'charisma', label: 'Charisme', short: 'CHA' },
];

const DEFAULT_ABILITY_SCORES: AbilityScores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

// ============================================================
// SOUS-COMPOSANT — Bloc de stat
// ============================================================

interface StatBlockProps {
  label: string;
  short: string;
  value: number;
  onChange: (value: number) => void;
}

function StatBlock({ label, short, value, onChange }: StatBlockProps): React.ReactElement {
  return (
    <div className="stat-block" title={label}>
      <span className="stat-block-short">{short}</span>
      <input
        type="number"
        min={1}
        max={30}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="stat-block-value"
      />
      <span className="stat-block-mod">{modifier(value)}</span>
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANT — Fiche détail
// ============================================================

interface CharacterSheetProps {
  character: Character;
  onUpdate: (changes: Partial<Omit<Character, 'id'>>) => void;
  onDelete: () => void;
}

function CharacterSheet({
  character,
  onUpdate,
  onDelete,
}: CharacterSheetProps): React.ReactElement {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleAbilityChange(key: keyof AbilityScores, value: number): void {
    onUpdate({
      abilityScores: {
        ...(character.abilityScores ?? DEFAULT_ABILITY_SCORES),
        [key]: value,
      },
    });
  }

  return (
    <div className="character-sheet">
      {/* En-tête */}
      <div className="character-sheet-header">
        <div className="character-sheet-avatar">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} />
          ) : (
            <GiCharacter />
          )}
        </div>

        <div className="character-sheet-identity">
          <input
            className="character-sheet-name"
            type="text"
            placeholder="Nom du personnage..."
            value={character.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
          <div className="character-sheet-meta">
            <input
              type="text"
              placeholder="Race..."
              value={character.race ?? ''}
              onChange={(e) => onUpdate({ race: e.target.value })}
              className="character-sheet-meta-input"
            />
            <input
              type="text"
              placeholder="Classe..."
              value={character.class ?? ''}
              onChange={(e) => onUpdate({ class: e.target.value })}
              className="character-sheet-meta-input"
            />
            <input
              type="number"
              placeholder="Niv."
              min={1}
              max={20}
              value={character.level ?? ''}
              onChange={(e) => onUpdate({ level: Number(e.target.value) })}
              className="character-sheet-meta-input character-sheet-level"
            />
          </div>
          <div className="character-sheet-type">
            <button
              className={`type-badge ${character.type === 'player' ? 'active' : ''}`}
              onClick={() => onUpdate({ type: 'player' })}
            >
              PJ
            </button>
            <button
              className={`type-badge ${character.type === 'npc' ? 'active' : ''}`}
              onClick={() => onUpdate({ type: 'npc' })}
            >
              PNJ
            </button>
          </div>
        </div>

        <button
          className="character-sheet-delete"
          onClick={() => setConfirmDelete(true)}
          title="Supprimer"
        >
          <TbTrash />
        </button>
      </div>

      {/* HP + AC */}
      <div className="character-sheet-combat">
        <div className="combat-stat">
          <TbSword />
          <div className="combat-stat-values">
            <label>Points de vie</label>
            <div className="combat-stat-hp">
              <input
                type="number"
                min={0}
                value={character.hp?.current ?? 0}
                onChange={(e) =>
                  onUpdate({
                    hp: {
                      current: Number(e.target.value),
                      max: character.hp?.max ?? 0,
                      temp: character.hp?.temp,
                    },
                  })
                }
                className="combat-stat-input"
                title="HP actuels"
              />
              <span>/</span>
              <input
                type="number"
                min={0}
                value={character.hp?.max ?? 0}
                onChange={(e) =>
                  onUpdate({
                    hp: {
                      current: character.hp?.current ?? 0,
                      max: Number(e.target.value),
                      temp: character.hp?.temp,
                    },
                  })
                }
                className="combat-stat-input"
                title="HP max"
              />
              <span className="combat-stat-temp">
                +
                <input
                  type="number"
                  min={0}
                  value={character.hp?.temp ?? 0}
                  onChange={(e) =>
                    onUpdate({
                      hp: {
                        current: character.hp?.current ?? 0,
                        max: character.hp?.max ?? 0,
                        temp: Number(e.target.value),
                      },
                    })
                  }
                  className="combat-stat-input"
                  title="HP temporaires"
                />
                <span className="combat-stat-temp-label">tmp</span>
              </span>
            </div>
          </div>
        </div>

        <div className="combat-stat">
          <TbShield />
          <div className="combat-stat-values">
            <label>Classe d&apos;armure</label>
            <input
              type="number"
              min={0}
              value={character.ac ?? 10}
              onChange={(e) => onUpdate({ ac: Number(e.target.value) })}
              className="combat-stat-input combat-stat-ac"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="character-sheet-section">
        <h3>Caractéristiques</h3>
        <div className="stat-blocks">
          {ABILITY_LABELS.map(({ key, label, short }) => (
            <StatBlock
              key={key}
              label={label}
              short={short}
              value={character.abilityScores?.[key] ?? 10}
              onChange={(v) => handleAbilityChange(key, v)}
            />
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="character-sheet-section">
        <h3>Description</h3>
        <textarea
          placeholder="Apparence, personnalité, historique..."
          value={character.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="character-sheet-textarea"
          rows={4}
        />
      </div>

      {/* Notes libres */}
      <div className="character-sheet-section">
        <h3>Notes</h3>
        <textarea
          placeholder="Notes de session, secrets, objectifs..."
          value={character.notes ?? ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          className="character-sheet-textarea"
          rows={4}
        />
      </div>

      {/* Confirm suppression */}
      {confirmDelete && (
        <div className="character-sheet-confirm-delete">
          <p>
            Supprimer <strong>{character.name}</strong> ?
          </p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
              Annuler
            </button>
            <button className="btn-danger" onClick={onDelete}>
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function Characters(): React.ReactElement {
  const {
    characters,
    selectedCharacter,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    selectCharacter,
  } = useCharactersStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'player' | 'npc'>('all');

  const filtered = useMemo(() => {
    let result = [...characters];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filterType !== 'all') {
      result = result.filter((c) => c.type === filterType);
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [characters, search, filterType]);

  function handleAdd(): void {
    addCharacter({
      name: '',
      type: 'npc',
      abilityScores: { ...DEFAULT_ABILITY_SCORES },
    });
    const created = useCharactersStore.getState().characters.at(-1);
    if (created) selectCharacter(created);
  }

  function handleUpdate(changes: Partial<Omit<Character, 'id'>>): void {
    if (!selectedCharacter) return;
    updateCharacter(selectedCharacter.id, changes);
  }

  function handleDelete(): void {
    if (!selectedCharacter) return;
    deleteCharacter(selectedCharacter.id);
  }

  return (
    <div className="characters">
      {/* ── COLONNE GAUCHE ── */}
      <div className="characters-sidebar">
        <div className="notes-toolbar">
          <div className="notes-search">
            <TbSearch />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-icon" onClick={handleAdd} title="Nouveau personnage">
            <TbPlus />
          </button>
        </div>

        {/* Filtre PJ / PNJ */}
        <div className="characters-filter">
          {(['all', 'player', 'npc'] as const).map((type) => (
            <button
              key={type}
              className={`type-badge ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? 'Tous' : type === 'player' ? 'PJ' : 'PNJ'}
            </button>
          ))}
        </div>

        <ul className="characters-list">
          {filtered.length > 0 ? (
            filtered.map((character) => (
              <li
                key={character.id}
                className={`characters-list-item ${selectedCharacter?.id === character.id ? 'active' : ''}`}
                onClick={() => selectCharacter(character)}
              >
                <div className="characters-list-avatar">
                  {character.imageUrl ? (
                    <img src={character.imageUrl} alt={character.name} />
                  ) : (
                    <GiCharacter />
                  )}
                </div>
                <div className="characters-list-info">
                  <span className="characters-list-name">{character.name || 'Sans nom'}</span>
                  <span className="characters-list-sub">
                    {[character.race, character.class].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
                <span className={`type-badge small ${character.type}`}>
                  {character.type === 'player' ? 'PJ' : 'PNJ'}
                </span>
              </li>
            ))
          ) : (
            <p className="notes-empty">Aucun personnage trouvé.</p>
          )}
        </ul>
      </div>

      {/* ── COLONNE DROITE ── */}
      <div className="characters-detail">
        {selectedCharacter ? (
          <CharacterSheet
            character={selectedCharacter}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ) : (
          <div className="notes-editor-empty">
            <GiCharacter />
            <p>Sélectionne un personnage ou crées-en un nouveau</p>
          </div>
        )}
      </div>
    </div>
  );
}
