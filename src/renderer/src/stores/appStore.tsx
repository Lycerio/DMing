import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppMode, Section, Campaign, Session } from '../types';

interface AppState {
  // --- STATE ---
  mode: AppMode;
  activeSection: Section;
  activeCampaign: Campaign | null;
  activeSession: Session | null;

  // --- ACTIONS ---
  setMode: (mode: AppMode) => void;
  setActiveSection: (section: Section) => void;
  setActiveCampaign: (campaign: Campaign | null) => void;
  setActiveSession: (session: Session | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Valeurs par défaut au démarrage
      mode: 'preparation',
      activeSection: 'notes',
      activeCampaign: null,
      activeSession: null,

      // Les actions — chacune appelle set() avec ce qui change
      setMode: (mode) => set({ mode }),
      setActiveSection: (section) => set({ activeSection: section }),
      setActiveCampaign: (campaign) => set({ activeCampaign: campaign }),
      setActiveSession: (session) => set({ activeSession: session }),
    }),
    {
      name: 'dm-companion-app', // Clé dans le localStorage
    }
  )
);
