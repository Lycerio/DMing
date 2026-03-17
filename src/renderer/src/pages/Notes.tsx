import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { GiQuillInk } from 'react-icons/gi';
import {
  TbPlus,
  TbSearch,
  TbX,
  TbChevronRight,
  TbChevronDown,
  TbFolder,
  TbFolderOpen,
  TbNote,
  TbArrowsSort,
} from 'react-icons/tb';
import { useNotesStore } from '../stores/notesStore';
import type { Note, NoteFolder } from '../types';

// ============================================================
// TYPES
// ============================================================

type SortOrder = 'date-desc' | 'date-asc' | 'title-asc' | 'manual';

type TreeItem = (NoteFolder & { itemType: 'folder' }) | (Note & { itemType: 'note' });

interface ContextMenuState {
  x: number;
  y: number;
  type: 'note' | 'folder' | 'background';
  id?: string;
  parentFolderId?: string | null;
}

interface AddMenuState {
  x: number;
  y: number;
  parentFolderId: string | null;
}

interface DragState {
  id: string;
  type: 'note' | 'folder';
  sourceFolderId: string | null;
}

interface DropIndicator {
  targetId: string;
  position: 'before' | 'after' | 'inside';
}

// ============================================================
// HELPERS
// ============================================================

function renderMentions(content: string, notes: Note[]): string {
  return content.replace(/@([\w\s-]+)/g, (match, name: string) => {
    const found = notes.find((n) => n.title.toLowerCase() === name.trim().toLowerCase());
    return found ? `**[@${found.title}](#note-${found.id})**` : match;
  });
}

function getFolderKey(folderId: string | null): string {
  return folderId ?? 'root';
}

function applyManualOrder(items: { id: string }[], order: string[]): { id: string }[] {
  if (!order.length) return items;
  const ordered = order.map((id) => items.find((i) => i.id === id)).filter(Boolean) as {
    id: string;
  }[];
  const unordered = items.filter((i) => !order.includes(i.id));
  return [...ordered, ...unordered];
}

function getItemLabel(item: TreeItem): string {
  return item.itemType === 'folder' ? item.name : item.title || 'Sans titre';
}

function buildBreadcrumb(note: Note, allFolders: NoteFolder[]): string[] {
  const path: string[] = [];
  let currentId = note.folderId;
  while (currentId) {
    const folder = allFolders.find((f) => f.id === currentId);
    if (!folder) break;
    path.unshift(folder.name);
    currentId = folder.parentId;
  }
  return path;
}

// ============================================================
// SOUS-COMPOSANT — Menu contextuel
// ============================================================

interface ContextMenuProps {
  menu: ContextMenuState;
  notes: Note[];
  folders: NoteFolder[];
  onClose: () => void;
  onRenameNote: (id: string) => void;
  onDuplicateNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onAddTag: (id: string) => void;
  onRenameFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onNewNote: (folderId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
}

function ContextMenu({
  menu,
  notes,
  folders,
  onClose,
  onRenameNote,
  onDuplicateNote,
  onDeleteNote,
  onAddTag,
  onRenameFolder,
  onDeleteFolder,
  onNewNote,
  onNewFolder,
}: ContextMenuProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const label =
    menu.type === 'note'
      ? notes.find((n) => n.id === menu.id)?.title || 'Sans titre'
      : menu.type === 'folder'
        ? folders.find((f) => f.id === menu.id)?.name || 'Dossier'
        : null;

  return (
    <div ref={ref} className="context-menu" style={{ top: menu.y, left: menu.x }}>
      {label && <div className="context-menu-header">{label}</div>}

      {menu.type === 'background' && (
        <>
          <button
            onClick={() => {
              onNewNote(menu.parentFolderId ?? null);
              onClose();
            }}
          >
            <TbNote style={{ marginRight: '0.5rem' }} /> Nouvelle note
          </button>
          <button
            onClick={() => {
              onNewFolder(menu.parentFolderId ?? null);
              onClose();
            }}
          >
            <TbFolder style={{ marginRight: '0.5rem' }} /> Nouveau dossier
          </button>
        </>
      )}

      {menu.type === 'note' && menu.id && (
        <>
          <button
            onClick={() => {
              onRenameNote(menu.id!);
              onClose();
            }}
          >
            Renommer
          </button>
          <button
            onClick={() => {
              onDuplicateNote(menu.id!);
              onClose();
            }}
          >
            Dupliquer
          </button>
          <button
            onClick={() => {
              onAddTag(menu.id!);
              onClose();
            }}
          >
            Ajouter un tag
          </button>
          <div className="context-menu-separator" />
          <button
            className="context-menu-danger"
            onClick={() => {
              onDeleteNote(menu.id!);
              onClose();
            }}
          >
            Supprimer
          </button>
        </>
      )}

      {menu.type === 'folder' && menu.id && (
        <>
          <button
            onClick={() => {
              onNewNote(menu.id!);
              onClose();
            }}
          >
            <TbNote style={{ marginRight: '0.5rem' }} /> Nouvelle note ici
          </button>
          <button
            onClick={() => {
              onNewFolder(menu.id!);
              onClose();
            }}
          >
            <TbFolder style={{ marginRight: '0.5rem' }} /> Nouveau sous-dossier
          </button>
          <div className="context-menu-separator" />
          <button
            onClick={() => {
              onRenameFolder(menu.id!);
              onClose();
            }}
          >
            Renommer
          </button>
          <div className="context-menu-separator" />
          <button
            className="context-menu-danger"
            onClick={() => {
              onDeleteFolder(menu.id!);
              onClose();
            }}
          >
            Supprimer le dossier
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANT — Menu +
// ============================================================

interface AddMenuProps {
  menu: AddMenuState;
  onNewNote: (folderId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onClose: () => void;
}

function AddMenu({ menu, onNewNote, onNewFolder, onClose }: AddMenuProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="context-menu" style={{ top: menu.y, left: menu.x }}>
      <button
        onClick={() => {
          onNewNote(menu.parentFolderId);
          onClose();
        }}
      >
        <TbNote style={{ marginRight: '0.5rem' }} /> Nouvelle note
      </button>
      <button
        onClick={() => {
          onNewFolder(menu.parentFolderId);
          onClose();
        }}
      >
        <TbFolder style={{ marginRight: '0.5rem' }} /> Nouveau dossier
      </button>
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANT — Palette Ctrl+P
// ============================================================

interface SearchPaletteProps {
  notes: Note[];
  onSelect: (note: Note) => void;
  onClose: () => void;
}

function SearchPalette({ notes, onSelect, onClose }: SearchPaletteProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return notes.slice(0, 8);
    const q = query.toLowerCase();
    return notes
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 8);
  }, [notes, query]);

  return (
    <div className="palette-overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-search">
          <TbSearch />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher une note..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose}>
            <TbX />
          </button>
        </div>
        <ul className="palette-results">
          {results.length > 0 ? (
            results.map((note) => (
              <li key={note.id}>
                <button
                  onClick={() => {
                    onSelect(note);
                    onClose();
                  }}
                >
                  <span className="palette-result-title">{note.title || 'Sans titre'}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="palette-empty">Aucune note trouvée</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANT — Arborescence récursive
// ============================================================

interface FolderTreeProps {
  folderId: string | null;
  folders: NoteFolder[];
  notes: Note[];
  selectedNoteId: string | null;
  sortOrder: SortOrder;
  manualOrder: Record<string, string[]>;
  renamingId: string | null;
  renameValue: string;
  dragState: DragState | null;
  dropIndicator: DropIndicator | null;
  onSelectNote: (note: Note) => void;
  onContextMenuNote: (e: React.MouseEvent, id: string) => void;
  onContextMenuFolder: (e: React.MouseEvent, id: string) => void;
  onRenameConfirm: (id: string) => void;
  onRenameChange: (value: string) => void;
  onRenameCancel: () => void;
  onAddMenuOpen: (e: React.MouseEvent, parentFolderId: string | null) => void;
  onDragStart: (id: string, type: 'note' | 'folder', sourceFolderId: string | null) => void;
  onDragOverItem: (
    e: React.DragEvent,
    id: string,
    type: 'note' | 'folder',
    position: 'before' | 'after' | 'inside'
  ) => void;
  onDragLeave: () => void;
  onDrop: (
    targetId: string,
    position: 'before' | 'after' | 'inside',
    targetFolderId: string | null
  ) => void;
  onDropOnRoot: (e: React.DragEvent) => void;
  depth?: number;
}

function FolderTree({
  folderId,
  folders,
  notes,
  selectedNoteId,
  sortOrder,
  manualOrder,
  renamingId,
  renameValue,
  dragState,
  dropIndicator,
  onSelectNote,
  onContextMenuNote,
  onContextMenuFolder,
  onRenameConfirm,
  onRenameChange,
  onRenameCancel,
  onAddMenuOpen,
  onDragStart,
  onDragOverItem,
  onDragLeave,
  onDrop,
  onDropOnRoot,
  depth = 0,
}: FolderTreeProps): React.ReactElement {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  function toggleFolder(id: string): void {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allItems = useMemo((): TreeItem[] => {
    const folderItems: TreeItem[] = folders
      .filter((f) => f.parentId === folderId)
      .map((f) => ({ ...f, itemType: 'folder' as const }));

    const noteItems: TreeItem[] = notes
      .filter((n) => n.folderId === folderId)
      .map((n) => ({ ...n, itemType: 'note' as const }));

    const combined: TreeItem[] = [...folderItems, ...noteItems];

    if (sortOrder === 'manual') {
      return applyManualOrder(combined, manualOrder[getFolderKey(folderId)] ?? []) as TreeItem[];
    }

    switch (sortOrder) {
      case 'date-desc':
        return combined.slice().sort((a, b) => {
          const dateA = new Date('updatedAt' in a ? a.updatedAt : a.createdAt).getTime();
          const dateB = new Date('updatedAt' in b ? b.updatedAt : b.createdAt).getTime();
          return dateB - dateA;
        });
      case 'date-asc':
        return combined.slice().sort((a, b) => {
          const dateA = new Date('updatedAt' in a ? a.updatedAt : a.createdAt).getTime();
          const dateB = new Date('updatedAt' in b ? b.updatedAt : b.createdAt).getTime();
          return dateA - dateB;
        });
      case 'title-asc':
        return combined.slice().sort((a, b) => {
          const labelA = a.itemType === 'folder' ? a.name : a.title;
          const labelB = b.itemType === 'folder' ? b.name : b.title;
          return labelA.localeCompare(labelB);
        });
    }
  }, [folders, notes, folderId, sortOrder, manualOrder]);

  return (
    <>
      {allItems.map((item) => {
        const indicator = dropIndicator?.targetId === item.id ? dropIndicator : null;
        const isSelf = dragState?.id === item.id;

        if (item.itemType === 'folder') {
          const isOpen = openFolders.has(item.id);
          return (
            <React.Fragment key={item.id}>
              {indicator?.position === 'before' && (
                <li className="drop-line-item">
                  <div className="drop-line" />
                </li>
              )}
              <li className="notes-tree-item">
                <div
                  className={`notes-tree-folder ${indicator?.position === 'inside' ? 'drag-over' : ''} ${isSelf ? 'dragging' : ''}`}
                  style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
                  onClick={() => toggleFolder(item.id)}
                  onContextMenu={(e) => onContextMenuFolder(e, item.id)}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    onDragStart(item.id, 'folder', folderId);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const zone = rect.height * 0.25;
                    const relY = e.clientY - rect.top;
                    const position =
                      relY < zone ? 'before' : relY > rect.height - zone ? 'after' : 'inside';
                    onDragOverItem(e, item.id, 'folder', position);
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    onDragLeave();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const position = dropIndicator?.position ?? 'inside';
                    onDrop(item.id, position, folderId);
                  }}
                >
                  <span className="notes-tree-chevron">
                    {isOpen ? <TbChevronDown /> : <TbChevronRight />}
                  </span>
                  <span className="notes-tree-folder-icon">
                    {isOpen ? <TbFolderOpen /> : <TbFolder />}
                  </span>
                  {renamingId === item.id ? (
                    <input
                      autoFocus
                      className="notes-list-rename"
                      value={renameValue}
                      onChange={(e) => onRenameChange(e.target.value)}
                      onBlur={() => onRenameConfirm(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onRenameConfirm(item.id);
                        if (e.key === 'Escape') onRenameCancel();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="notes-tree-folder-name">{item.name}</span>
                  )}
                  <button
                    className="notes-tree-add"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddMenuOpen(e, item.id);
                    }}
                    title="Ajouter dans ce dossier"
                  >
                    <TbPlus />
                  </button>
                </div>

                {isOpen && (
                  <ul className="notes-tree-children">
                    <FolderTree
                      folderId={item.id}
                      folders={folders}
                      notes={notes}
                      selectedNoteId={selectedNoteId}
                      sortOrder={sortOrder}
                      manualOrder={manualOrder}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      dragState={dragState}
                      dropIndicator={dropIndicator}
                      onSelectNote={onSelectNote}
                      onContextMenuNote={onContextMenuNote}
                      onContextMenuFolder={onContextMenuFolder}
                      onRenameConfirm={onRenameConfirm}
                      onRenameChange={onRenameChange}
                      onRenameCancel={onRenameCancel}
                      onAddMenuOpen={onAddMenuOpen}
                      onDragStart={onDragStart}
                      onDragOverItem={onDragOverItem}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onDropOnRoot={onDropOnRoot}
                      depth={depth + 1}
                    />
                  </ul>
                )}
              </li>
              {indicator?.position === 'after' &&
                !isOpen && ( // ← isOpen accessible ici
                  <li className="drop-line-item">
                    <div className="drop-line" />
                  </li>
                )}
            </React.Fragment>
          );
        }

        // ── NOTE ──────────────────────────────────────────────────
        return (
          <React.Fragment key={item.id}>
            {indicator?.position === 'before' && (
              <li className="drop-line-item">
                <div className="drop-line" />
              </li>
            )}
            <li
              className={`notes-list-item ${selectedNoteId === item.id ? 'active' : ''} ${isSelf ? 'dragging' : ''}`}
              style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
              onClick={() => onSelectNote(item as Note)}
              onContextMenu={(e) => onContextMenuNote(e, item.id)}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                onDragStart(item.id, 'note', folderId);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const position = e.clientY < midY ? 'before' : 'after';
                onDragOverItem(e, item.id, 'note', position);
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                onDragLeave();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const position = dropIndicator?.position ?? 'after';
                onDrop(item.id, position, folderId);
              }}
            >
              {renamingId === item.id ? (
                <input
                  autoFocus
                  className="notes-list-rename"
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onBlur={() => onRenameConfirm(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onRenameConfirm(item.id);
                    if (e.key === 'Escape') onRenameCancel();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="notes-list-item-title">{getItemLabel(item)}</span>
              )}
            </li>
            {indicator?.position === 'after' && (
              <li className="drop-line-item">
                <div className="drop-line" />
              </li>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function Notes(): React.ReactElement {
  const {
    notes,
    folders,
    selectedNote,
    manualOrder,
    addNote,
    updateNote,
    deleteNote,
    selectNote,
    addFolder,
    renameFolder,
    deleteFolder,
    moveNote,
    setManualOrder,
  } = useNotesStore();

  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [addMenu, setAddMenu] = useState<AddMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSort(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleDragEnd(): void {
      setDragState(null);
      setDropIndicator(null);
    }
    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!filterTag) return notes;
    return notes.filter((n) => n.tags?.includes(filterTag));
  }, [notes, filterTag]);

  const breadcrumb = useMemo(
    () => (selectedNote ? buildBreadcrumb(selectedNote, folders) : []),
    [selectedNote, folders]
  );

  function handleNewNote(folderId: string | null): void {
    addNote({ title: '', content: '', tags: [], folderId });
    const created = useNotesStore.getState().notes.at(-1);
    if (created) selectNote(created);
  }

  function handleNewFolder(parentId: string | null): void {
    addFolder('Nouveau dossier', parentId);
    const created = useNotesStore.getState().folders.at(-1);
    if (created) {
      setRenamingId(created.id);
      setRenameValue('Nouveau dossier');
    }
  }

  function handleContentChange(value?: string): void {
    if (!selectedNote) return;
    updateNote(selectedNote.id, { content: value ?? '' });
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (!selectedNote) return;
    updateNote(selectedNote.id, { title: e.target.value });
  }

  const handleRenameNote = useCallback(
    (id: string): void => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      setRenamingId(id);
      setRenameValue(note.title);
    },
    [notes]
  );

  const handleRenameFolder = useCallback(
    (id: string): void => {
      const folder = folders.find((f) => f.id === id);
      if (!folder) return;
      setRenamingId(id);
      setRenameValue(folder.name);
    },
    [folders]
  );

  function confirmRename(id: string): void {
    const isFolder = folders.some((f) => f.id === id);
    if (isFolder) renameFolder(id, renameValue);
    else updateNote(id, { title: renameValue });
    setRenamingId(null);
  }

  function handleContextMenuNote(e: React.MouseEvent, id: string): void {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'note', id });
  }

  function handleContextMenuFolder(e: React.MouseEvent, id: string): void {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id });
  }

  function handleContextMenuBackground(e: React.MouseEvent): void {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'background', parentFolderId: null });
  }

  function handleAddMenuOpen(e: React.MouseEvent, parentFolderId: string | null): void {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAddMenu({ x: rect.left, y: rect.bottom + 4, parentFolderId });
  }

  function handleDragStart(
    id: string,
    type: 'note' | 'folder',
    sourceFolderId: string | null
  ): void {
    setDragState({ id, type, sourceFolderId });
    setSortOrder('manual');
  }

  function handleDragOverItem(
    e: React.DragEvent,
    id: string,
    _type: 'note' | 'folder',
    position: 'before' | 'after' | 'inside'
  ): void {
    e.preventDefault();
    if (dragState?.id === id) return;
    setDropIndicator({ targetId: id, position });
  }

  function handleDragLeave(): void {
    setDropIndicator(null);
  }

  function handleDrop(
    targetId: string,
    position: 'before' | 'after' | 'inside',
    targetFolderId: string | null
  ): void {
    if (!dragState) return;
    if (dragState.id === targetId) return;

    if (position === 'inside') {
      // Uniquement pour les dossiers
      if (dragState.type === 'note') {
        moveNote(dragState.id, targetId);
      } else {
        function isDescendant(parentId: string, childId: string): boolean {
          const children = folders.filter((f) => f.parentId === parentId);
          return children.some((c) => c.id === childId || isDescendant(c.id, childId));
        }
        if (isDescendant(dragState.id, targetId)) return;
        useNotesStore.setState((state) => ({
          folders: state.folders.map((f) =>
            f.id === dragState.id ? { ...f, parentId: targetId } : f
          ),
        }));
      }
    } else {
      // before/after — réorganisation
      const folderKey = getFolderKey(targetFolderId);

      if (dragState.type === 'note') {
        if (dragState.sourceFolderId !== targetFolderId) {
          moveNote(dragState.id, targetFolderId);
        }
        // Construit l'ordre à partir de tous les items du niveau
        const levelNotes = notes.filter((n) => n.folderId === targetFolderId);
        const levelFolders = folders.filter((f) => f.parentId === targetFolderId);
        const allIds = [...levelFolders.map((f) => f.id), ...levelNotes.map((n) => n.id)];
        const currentOrder = manualOrder[folderKey]?.length ? manualOrder[folderKey] : allIds;
        const withoutDragged = currentOrder.filter((id) => id !== dragState.id);
        const targetIndex = withoutDragged.indexOf(targetId);
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        withoutDragged.splice(insertIndex, 0, dragState.id);
        setManualOrder(targetFolderId, withoutDragged);
      } else {
        if (dragState.sourceFolderId !== targetFolderId) {
          useNotesStore.setState((state) => ({
            folders: state.folders.map((f) =>
              f.id === dragState.id ? { ...f, parentId: targetFolderId } : f
            ),
          }));
        }
        const levelNotes = notes.filter((n) => n.folderId === targetFolderId);
        const levelFolders = folders.filter((f) => f.parentId === targetFolderId);
        const allIds = [...levelFolders.map((f) => f.id), ...levelNotes.map((n) => n.id)];
        const currentOrder = manualOrder[folderKey]?.length ? manualOrder[folderKey] : allIds;
        const withoutDragged = currentOrder.filter((id) => id !== dragState.id);
        const targetIndex = withoutDragged.indexOf(targetId);
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        withoutDragged.splice(insertIndex, 0, dragState.id);
        setManualOrder(targetFolderId, withoutDragged);
      }
    }

    setDragState(null);
    setDropIndicator(null);
  }

  function handleDropOnRoot(e: React.DragEvent): void {
    e.preventDefault();
    if (!dragState) return;
    if (dragState.type === 'note') {
      moveNote(dragState.id, null);
    } else {
      useNotesStore.setState((state) => ({
        folders: state.folders.map((f) => (f.id === dragState.id ? { ...f, parentId: null } : f)),
      }));
    }
    setDragState(null);
    setDropIndicator(null);
  }

  const handleDuplicate = useCallback(
    (id: string): void => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      addNote({
        title: `${note.title} (copie)`,
        content: note.content,
        tags: note.tags,
        folderId: note.folderId,
      });
    },
    [notes, addNote]
  );

  const handleAddTag = useCallback(
    (id: string): void => {
      const tag = window.prompt('Nouveau tag :');
      if (tag?.trim()) {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        updateNote(id, { tags: [...(note.tags ?? []), tag.trim()] });
      }
    },
    [notes, updateNote]
  );

  const contentWithMentions = selectedNote ? renderMentions(selectedNote.content, notes) : '';

  return (
    <div className="notes">
      {showPalette && (
        <SearchPalette
          notes={filteredNotes}
          onSelect={selectNote}
          onClose={() => setShowPalette(false)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          notes={notes}
          folders={folders}
          onClose={() => setContextMenu(null)}
          onRenameNote={handleRenameNote}
          onDuplicateNote={handleDuplicate}
          onDeleteNote={deleteNote}
          onAddTag={handleAddTag}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={deleteFolder}
          onNewNote={handleNewNote}
          onNewFolder={handleNewFolder}
        />
      )}

      {addMenu && (
        <AddMenu
          menu={addMenu}
          onNewNote={handleNewNote}
          onNewFolder={handleNewFolder}
          onClose={() => setAddMenu(null)}
        />
      )}

      {/* ── COLONNE GAUCHE ── */}
      <div
        className="notes-sidebar"
        onContextMenu={handleContextMenuBackground}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropOnRoot}
      >
        <div className="notes-sidebar-header">
          <span className="notes-sidebar-title">Notes</span>
          <div className="notes-sidebar-actions">
            <button
              className="btn-icon-ghost"
              onClick={() => setShowPalette(true)}
              title="Rechercher (Ctrl+P)"
            >
              <TbSearch />
            </button>

            <div className="notes-sort-wrapper" ref={sortRef}>
              <button
                className={`btn-icon-ghost ${sortOrder !== 'date-desc' ? 'active' : ''}`}
                onClick={() => setShowSort((v) => !v)}
                title="Trier"
              >
                <TbArrowsSort />
              </button>
              {showSort && (
                <div className="notes-sort-panel">
                  {(
                    [
                      ['date-desc', 'Plus récent'],
                      ['date-asc', 'Plus ancien'],
                      ['title-asc', 'Titre A→Z'],
                      ['manual', 'Manuel'],
                    ] as [SortOrder, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      className={`notes-sort-option ${sortOrder === value ? 'active' : ''}`}
                      onClick={() => {
                        setSortOrder(value);
                        setShowSort(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="btn-icon-ghost"
              onClick={(e) => handleAddMenuOpen(e, null)}
              title="Nouveau..."
            >
              <TbPlus />
            </button>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="notes-tag-filter">
            <button
              className={`tag ${!filterTag ? 'active' : ''}`}
              onClick={() => setFilterTag(null)}
            >
              Tous
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag ${filterTag === tag ? 'active' : ''}`}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <ul className="notes-list">
          <FolderTree
            folderId={null}
            folders={folders}
            notes={filteredNotes}
            selectedNoteId={selectedNote?.id ?? null}
            sortOrder={sortOrder}
            manualOrder={manualOrder}
            renamingId={renamingId}
            renameValue={renameValue}
            dragState={dragState}
            dropIndicator={dropIndicator}
            onSelectNote={selectNote}
            onContextMenuNote={handleContextMenuNote}
            onContextMenuFolder={handleContextMenuFolder}
            onRenameConfirm={confirmRename}
            onRenameChange={setRenameValue}
            onRenameCancel={() => setRenamingId(null)}
            onAddMenuOpen={handleAddMenuOpen}
            onDragStart={handleDragStart}
            onDragOverItem={handleDragOverItem}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDropOnRoot={handleDropOnRoot}
          />
        </ul>
      </div>

      {/* ── COLONNE DROITE ── */}
      <div className="notes-editor">
        {selectedNote ? (
          <>
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
              <div className="notes-breadcrumb">
                {breadcrumb.map((segment, i, arr) => (
                  <React.Fragment key={segment}>
                    <span className="notes-breadcrumb-segment">{segment}</span>
                    {i < arr.length - 1 && <span className="notes-breadcrumb-sep">/</span>}
                  </React.Fragment>
                ))}
              </div>
            )}

            <input
              className="notes-editor-title"
              type="text"
              placeholder="Titre..."
              value={selectedNote.title}
              onChange={handleTitleChange}
            />

            <div className="notes-editor-md" data-color-mode="dark">
              <MDEditor
                value={contentWithMentions}
                onChange={handleContentChange}
                preview="edit"
                hideToolbar={true}
                visibleDragbar={false}
                height="100%"
              />
            </div>
          </>
        ) : (
          <div className="notes-editor-empty">
            <GiQuillInk />
            <p>Sélectionne une note ou crées-en une nouvelle</p>
          </div>
        )}
      </div>
    </div>
  );
}
