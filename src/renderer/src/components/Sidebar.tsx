import React from 'react';
import {
  GiSwordsPower,
  GiScrollUnfurled,
  GiMusicalNotes,
  GiCharacter,
  GiSoundWaves,
  GiDragonHead,
} from 'react-icons/gi';
import { TbDoorExit } from 'react-icons/tb';
import { useAppStore } from '../stores/appStore';
import type { Section } from '../types';

// ============================================================
// CONFIG DE NAVIGATION
// ============================================================

interface NavItem {
  section: Section;
  label: string;
  icon: React.ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { section: 'notes', label: 'Notes', icon: <GiScrollUnfurled /> },
  { section: 'music', label: 'Musique', icon: <GiMusicalNotes /> },
  { section: 'characters', label: 'Personnages', icon: <GiCharacter /> },
  { section: 'soundboard', label: 'Soundboard', icon: <GiSoundWaves /> },
  { section: 'monsters', label: 'Monstres', icon: <GiDragonHead /> },
];

// ============================================================
// COMPOSANT
// ============================================================

export default function Sidebar(): React.ReactElement {
  const { activeCampaign, activeSection, setActiveSection, setActiveCampaign } = useAppStore();

  function handleChangeCampaign(): void {
    setActiveCampaign(null);
  }

  return (
    <aside className="sidebar">
      {/* Nom de la campagne */}
      <div className="sidebar-campaign">
        {activeCampaign?.imageUrl ? (
          <img
            src={activeCampaign.imageUrl}
            alt={activeCampaign.name}
            className="sidebar-campaign-img"
          />
        ) : (
          <div className="sidebar-campaign-icon">
            <GiSwordsPower />
          </div>
        )}
        <span className="sidebar-campaign-name">{activeCampaign?.name}</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.section}
            className={`sidebar-nav-item ${activeSection === item.section ? 'active' : ''}`}
            onClick={() => setActiveSection(item.section)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Changer de campagne — en bas de la sidebar */}
      <div className="sidebar-footer">
        <button className="sidebar-change-campaign" onClick={handleChangeCampaign}>
          <TbDoorExit />
          <span>Changer de campagne</span>
        </button>
      </div>
    </aside>
  );
}
