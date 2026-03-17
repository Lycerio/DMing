import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AudioTrack } from '../types';

// ============================================================
// TYPES KENKU
// ============================================================

export interface KenkuTrack {
  id: string;
  title: string;
  url: string;
  duration: number;
}

export interface KenkuPlaylist {
  id: string;
  name: string;
  tracks: KenkuTrack[];
  background: string;
}

export interface KenkuSoundboard {
  id: string;
  name: string;
  sounds: KenkuSound[];
}

export interface KenkuSound {
  id: string;
  title: string;
  url: string;
}

// ============================================================
// TYPES DU STORE
// ============================================================

type MusicSource = 'local' | 'kenku';

interface MusicState {
  // --- SOURCE ACTIVE ---
  source: MusicSource;

  // --- FICHIERS LOCAUX ---
  localTracks: AudioTrack[];
  currentLocalTrack: AudioTrack | null;
  isPlaying: boolean;
  volume: number;

  // --- KENKU FM ---
  kenkuConnected: boolean;
  kenkuPort: number;
  kenkuPlaylists: KenkuPlaylist[];
  kenkuSoundboards: KenkuSoundboard[];
  currentKenkuPlaylist: KenkuPlaylist | null;
  currentKenkuTrack: KenkuTrack | null;

  // --- ACTIONS GÉNÉRALES ---
  setSource: (source: MusicSource) => void;
  setVolume: (volume: number) => void;

  // --- ACTIONS LOCALES ---
  addLocalTrack: (track: Omit<AudioTrack, 'id'>) => void;
  removeLocalTrack: (id: string) => void;
  playLocal: (track: AudioTrack) => void;
  pause: () => void;
  stop: () => void;
  nextTrack: () => void;
  prevTrack: () => void;

  // --- ACTIONS KENKU ---
  setKenkuPort: (port: number) => void;
  connectToKenku: () => Promise<void>;
  fetchKenkuPlaylists: () => Promise<void>;
  playKenkuTrack: (playlistId: string, trackId: string) => Promise<void>;
  pauseKenku: () => Promise<void>;
  stopKenku: () => Promise<void>;
}

// ============================================================
// HELPER — appelle le main process via IPC pour éviter le CORS
// ============================================================

async function kenkuRequest<T>(
  port: number,
  method: 'GET' | 'PUT',
  endpoint: string,
  body?: object
): Promise<T> {
  return window.electron.ipcRenderer.invoke('kenku:request', {
    port,
    method,
    endpoint,
    body,
  });
}

// ============================================================
// STORE
// ============================================================

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      // Valeurs par défaut
      source: 'local',
      localTracks: [],
      currentLocalTrack: null,
      isPlaying: false,
      volume: 0.8,
      kenkuConnected: false,
      kenkuPort: 3333,
      kenkuPlaylists: [],
      kenkuSoundboards: [],
      currentKenkuPlaylist: null,
      currentKenkuTrack: null,

      // ── GÉNÉRAL ──────────────────────────────────────────

      setSource: (source) => set({ source }),

      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),

      // ── LOCAL ─────────────────────────────────────────────

      addLocalTrack: (track) =>
        set((state) => ({
          localTracks: [...state.localTracks, { ...track, id: crypto.randomUUID() }],
        })),

      removeLocalTrack: (id) =>
        set((state) => ({
          localTracks: state.localTracks.filter((t) => t.id !== id),
          currentLocalTrack: state.currentLocalTrack?.id === id ? null : state.currentLocalTrack,
          isPlaying: state.currentLocalTrack?.id === id ? false : state.isPlaying,
        })),

      playLocal: (track) => set({ currentLocalTrack: track, isPlaying: true, source: 'local' }),

      pause: () => set({ isPlaying: false }),

      stop: () => set({ currentLocalTrack: null, isPlaying: false }),

      nextTrack: () => {
        const { localTracks, currentLocalTrack } = get();
        if (!currentLocalTrack || localTracks.length === 0) return;
        const idx = localTracks.findIndex((t) => t.id === currentLocalTrack.id);
        const next = (idx + 1) % localTracks.length;
        set({ currentLocalTrack: localTracks[next], isPlaying: true });
      },

      prevTrack: () => {
        const { localTracks, currentLocalTrack } = get();
        if (!currentLocalTrack || localTracks.length === 0) return;
        const idx = localTracks.findIndex((t) => t.id === currentLocalTrack.id);
        const prev = (idx - 1 + localTracks.length) % localTracks.length;
        set({ currentLocalTrack: localTracks[prev], isPlaying: true });
      },

      // ── KENKU ─────────────────────────────────────────────

      setKenkuPort: (port) => set({ kenkuPort: port }),

      connectToKenku: async () => {
        const { kenkuPort } = get();
        try {
          await kenkuRequest<{ playlists: KenkuPlaylist[] }>(kenkuPort, 'GET', '/v1/playlist');
          set({ kenkuConnected: true });
          get().fetchKenkuPlaylists();
        } catch {
          set({ kenkuConnected: false });
          throw new Error(`Impossible de se connecter à Kenku FM sur le port ${kenkuPort}`);
        }
      },

      fetchKenkuPlaylists: async () => {
        const { kenkuPort } = get();
        try {
          const data = await kenkuRequest<{ playlists: KenkuPlaylist[] }>(
            kenkuPort,
            'GET',
            '/v1/playlist'
          );
          set({ kenkuPlaylists: data.playlists ?? [] });
        } catch {
          set({ kenkuConnected: false });
        }
      },

      playKenkuTrack: async (playlistId, trackId) => {
        const { kenkuPort, kenkuPlaylists } = get();
        try {
          await kenkuRequest<void>(kenkuPort, 'PUT', '/v1/playlist/playback', {
            playlistId,
            trackId,
          });
          const playlist = kenkuPlaylists.find((p) => p.id === playlistId) ?? null;
          const track = playlist?.tracks.find((t) => t.id === trackId) ?? null;
          set({
            currentKenkuPlaylist: playlist,
            currentKenkuTrack: track,
            source: 'kenku',
          });
        } catch {
          set({ kenkuConnected: false });
        }
      },

      pauseKenku: async () => {
        const { kenkuPort } = get();
        try {
          await kenkuRequest<void>(kenkuPort, 'PUT', '/v1/playlist/playback/pause');
        } catch {
          set({ kenkuConnected: false });
        }
      },

      stopKenku: async () => {
        const { kenkuPort } = get();
        try {
          await kenkuRequest<void>(kenkuPort, 'PUT', '/v1/playlist/playback/stop');
          set({ currentKenkuTrack: null, currentKenkuPlaylist: null });
        } catch {
          set({ kenkuConnected: false });
        }
      },
    }),
    {
      name: 'dm-companion-music',
      partialize: (state) => ({
        localTracks: state.localTracks,
        volume: state.volume,
        kenkuPort: state.kenkuPort,
      }),
    }
  )
);
