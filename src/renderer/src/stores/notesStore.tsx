import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Note, NoteFolder } from '../types';

// ============================================================
// TYPES
// ============================================================

type NotesStorePersist = Pick<NotesState, 'notes' | 'folders' | 'manualOrder'>;

interface NotesState {
  // STATE
  notes: Note[];
  folders: NoteFolder[];
  selectedNote: Note | null;
  manualOrder: Record<string, string[]>;

  // ACTIONS — notes
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, changes: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  deleteNote: (id: string) => void;
  selectNote: (note: Note | null) => void;
  moveNote: (noteId: string, folderId: string | null) => void;

  // ACTIONS — dossiers
  addFolder: (name: string, parentId: string | null) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // ACTIONS — ordre manuel
  setManualOrder: (folderId: string | null, orderedIds: string[]) => void;
}

// ============================================================
// STORE
// ============================================================

export const useNotesStore = create<NotesState, [['zustand/persist', NotesStorePersist]]>(
  persist(
    (set) => ({
      // Valeurs par défaut
      notes: [],
      folders: [],
      selectedNote: null,
      manualOrder: {} as Record<string, string[]>,

      // ── NOTES ──────────────────────────────────────────────

      addNote: (note) =>
        set((state) => ({
          notes: [
            ...state.notes,
            {
              ...note,
              id: crypto.randomUUID(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })),

      updateNote: (id, changes) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...changes, updatedAt: new Date() } : note
          ),
          selectedNote:
            state.selectedNote?.id === id
              ? { ...state.selectedNote, ...changes, updatedAt: new Date() }
              : state.selectedNote,
        })),

      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
        })),

      selectNote: (note) => set({ selectedNote: note }),

      moveNote: (noteId, folderId) =>
        set((state) => ({
          notes: state.notes.map((n) => (n.id === noteId ? { ...n, folderId } : n)),
        })),

      // ── DOSSIERS ───────────────────────────────────────────

      addFolder: (name, parentId) =>
        set((state) => ({
          folders: [
            ...state.folders,
            {
              id: crypto.randomUUID(),
              name,
              parentId,
              createdAt: new Date(),
            },
          ],
        })),

      renameFolder: (id, name) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)),
        })),

      deleteFolder: (id) =>
        set((state) => {
          function getDescendantIds(folderId: string): string[] {
            const children = state.folders.filter((f) => f.parentId === folderId);
            return [folderId, ...children.flatMap((c) => getDescendantIds(c.id))];
          }
          const toDelete = new Set(getDescendantIds(id));
          return {
            folders: state.folders.filter((f) => !toDelete.has(f.id)),
            notes: state.notes.filter((n) => !n.folderId || !toDelete.has(n.folderId)),
            selectedNote:
              state.selectedNote?.folderId && toDelete.has(state.selectedNote.folderId)
                ? null
                : state.selectedNote,
          };
        }),

      // ── ORDRE MANUEL ───────────────────────────────────────

      setManualOrder: (folderId, orderedIds) =>
        set((state) => ({
          manualOrder: {
            ...state.manualOrder,
            [folderId ?? 'root']: orderedIds,
          },
        })),
    }),
    {
      name: 'dm-companion-notes',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): NotesStorePersist => ({
        notes: state.notes,
        folders: state.folders,
        manualOrder: state.manualOrder,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.notes = state.notes.map((note) => ({
            ...note,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          }));
          state.folders = state.folders.map((folder) => ({
            ...folder,
            createdAt: new Date(folder.createdAt),
          }));
        }
      },
    }
  )
);
