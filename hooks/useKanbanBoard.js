import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { STATUSES, getAllNotes, updateNote, bulkUpdateBoardOrder } from '@/lib/note';

export function useKanbanBoard() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [bouncingIds, setBouncingIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const bounceTimersRef = useRef(new Set());
  const searchActive = search.trim().length > 0;

  const load = useCallback(async () => {
    await initDB();
    setNotes(await getAllNotes());
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(
    () => () => {
      bounceTimersRef.current.forEach(timer => clearTimeout(timer));
      bounceTimersRef.current.clear();
    },
    []
  );

  useVisibilityRefresh(load);

  const applyStatusChange = useCallback(
    async (note, newStatus, { bounce = true } = {}) => {
      setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, status: newStatus } : n)));
      try {
        await updateNote(note.id, { status: newStatus });
        showToast(`→ ${newStatus}`, 'ok');
        await load();
        if (bounce) {
          setBouncingIds(s => new Set([...s, note.id]));
          const timer = setTimeout(() => {
            setBouncingIds(s => {
              const n = new Set(s);
              n.delete(note.id);
              return n;
            });
            bounceTimersRef.current.delete(timer);
          }, 400);
          bounceTimersRef.current.add(timer);
        }
      } catch {
        showToast('상태 변경 실패', 'error');
        await load();
      }
    },
    [load]
  );

  const moveStatus = useCallback(
    (note, direction) => {
      const newIdx = STATUSES.indexOf(note.status) + direction;
      if (newIdx < 0 || newIdx >= STATUSES.length) return;
      return applyStatusChange(note, STATUSES[newIdx]);
    },
    [applyStatusChange]
  );

  const changeStatus = useCallback(
    (note, newStatus) => {
      if (note.status === newStatus) return;
      return applyStatusChange(note, newStatus);
    },
    [applyStatusChange]
  );

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.menuName || '').toLowerCase().includes(q) ||
        (n.testContent || '').toLowerCase().includes(q) ||
        (n.reportSummary || '').toLowerCase().includes(q) ||
        (n.tags || '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  const groupedNotes = useMemo(
    () =>
      STATUSES.map(st => ({
        status: st,
        notes: filteredNotes
          .filter(n => n.status === st)
          .sort((a, b) =>
            a.boardOrder != null && b.boardOrder != null
              ? a.boardOrder - b.boardOrder
              : a.boardOrder != null
                ? -1
                : b.boardOrder != null
                  ? 1
                  : 0
          ),
      })),
    [filteredNotes]
  );

  async function handleDrop(e, status) {
    e.preventDefault();
    setDragOverStatus(null);
    if (searchActive) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    const noteId = e.dataTransfer.getData('noteId');
    if (!noteId) {
      setDropTarget(null);
      return;
    }
    const note = notes.find(n => String(n.id) === String(noteId));
    if (!note) {
      setDropTarget(null);
      return;
    }

    const colNotes = groupedNotes.find(g => g.status === status)?.notes ?? [];
    const beforeIdx =
      dropTarget?.status === status ? (dropTarget.beforeIdx ?? colNotes.length) : colNotes.length;
    setDropTarget(null);

    if (note.status === status) {
      const without = colNotes.filter(n => n.id !== note.id);
      const origIdx = colNotes.findIndex(n => n.id === note.id);
      const insertAt = origIdx < beforeIdx ? beforeIdx - 1 : beforeIdx;
      without.splice(Math.max(0, Math.min(insertAt, without.length)), 0, note);
      await bulkUpdateBoardOrder(without.map((n, i) => ({ id: n.id, boardOrder: i * 10 })));
      await load();
    } else {
      const newCol = [...colNotes];
      newCol.splice(Math.min(beforeIdx, newCol.length), 0, note);
      const targetOrder = Math.min(beforeIdx, newCol.length - 1) * 10;
      await updateNote(note.id, { status, boardOrder: targetOrder });
      const siblingUpdates = newCol
        .filter(n => n.id !== note.id)
        .map((n, i) => ({
          id: n.id,
          boardOrder: (i >= Math.min(beforeIdx, newCol.length - 1) ? i + 1 : i) * 10,
        }));
      await bulkUpdateBoardOrder(siblingUpdates);
      showToast(`→ ${status}`, 'ok');
      await load();
      setBouncingIds(s => new Set([...s, note.id]));
      const timer = setTimeout(() => {
        setBouncingIds(s => {
          const n = new Set(s);
          n.delete(note.id);
          return n;
        });
        bounceTimersRef.current.delete(timer);
      }, 400);
      bounceTimersRef.current.add(timer);
    }
    setDragId(null);
  }

  return {
    notes,
    loading,
    search,
    setSearch,
    searchActive,
    filteredNotes,
    groupedNotes,
    dragId,
    setDragId,
    dragOverStatus,
    setDragOverStatus,
    dropTarget,
    setDropTarget,
    bouncingIds,
    handleDrop,
    moveStatus,
    changeStatus,
  };
}
