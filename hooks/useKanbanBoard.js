import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useMounted } from '@/hooks/useMounted';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { STATUSES, getAllNotesCached, updateNote, bulkUpdateBoardOrder } from '@/lib/note';
import { filterKanbanNotes } from '@/lib/note/filter';

export function useKanbanBoard({ canEdit = false } = {}) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [bouncingIds, setBouncingIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(null);
  const mountedRef = useMounted();
  const loadSeqRef = useRef(0);
  const bounceTimersRef = useRef(new Set());
  const searchActive = search.trim().length > 0;

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    try {
      await initDB();
      const nextNotes = filterKanbanNotes(await getAllNotesCached());
      if (!mountedRef.current || seq !== loadSeqRef.current) return false;
      setNotes(nextNotes);
      setLoadError(null);
      return true;
    } catch (err) {
      if (!mountedRef.current || seq !== loadSeqRef.current) return false;
      throw err;
    }
  }, [mountedRef]);

  const refreshNotes = useCallback(
    async ({ toast = false, finishLoading = false } = {}) => {
      let shouldFinishLoading = false;
      try {
        const applied = await load();
        if (!applied) return;
        shouldFinishLoading = true;
      } catch (err) {
        if (!mountedRef.current) return;
        shouldFinishLoading = true;
        console.error('[useKanbanBoard] load failed', err);
        const message = err?.message || '노트 데이터를 불러오지 못했습니다.';
        setLoadError(message);
        if (toast) showToast(`칸반 데이터 로드 실패: ${message}`, 'error');
      } finally {
        if (finishLoading && shouldFinishLoading && mountedRef.current) setLoading(false);
      }
    },
    [load, mountedRef]
  );

  useEffect(() => {
    refreshNotes({ toast: true, finishLoading: true });
  }, [refreshNotes]);

  useVisibilityRefresh(() => {
    refreshNotes();
  });

  const retryLoad = useCallback(() => {
    setLoading(true);
    refreshNotes({ toast: true, finishLoading: true });
  }, [refreshNotes]);

  const pulseNote = useCallback(
    noteId => {
      if (!mountedRef.current) return;
      setBouncingIds(s => new Set([...s, noteId]));
      const timer = setTimeout(() => {
        if (!mountedRef.current) return;
        setBouncingIds(s => {
          const n = new Set(s);
          n.delete(noteId);
          return n;
        });
        bounceTimersRef.current.delete(timer);
      }, 400);
      bounceTimersRef.current.add(timer);
    },
    [mountedRef]
  );

  useEffect(
    () => () => {
      bounceTimersRef.current.forEach(timer => clearTimeout(timer));
      bounceTimersRef.current.clear();
    },
    []
  );

  const applyStatusChange = useCallback(
    async (note, newStatus, { bounce = true } = {}) => {
      if (!canEdit) return;
      setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, status: newStatus } : n)));
      try {
        await updateNote(note.id, { status: newStatus });
        showToast(`→ ${newStatus}`, 'ok');
        await refreshNotes();
        if (bounce) pulseNote(note.id);
      } catch {
        showToast('상태 변경 실패', 'error');
        await refreshNotes();
      }
    },
    [canEdit, pulseNote, refreshNotes]
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
    if (!canEdit) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
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

    try {
      if (note.status === status) {
        const without = colNotes.filter(n => n.id !== note.id);
        const origIdx = colNotes.findIndex(n => n.id === note.id);
        const insertAt = origIdx < beforeIdx ? beforeIdx - 1 : beforeIdx;
        without.splice(Math.max(0, Math.min(insertAt, without.length)), 0, note);
        await bulkUpdateBoardOrder(without.map((n, i) => ({ id: n.id, boardOrder: i * 10 })));
        await refreshNotes();
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
        await refreshNotes();
        pulseNote(note.id);
      }
    } catch (err) {
      console.error('[useKanbanBoard] handleDrop failed', err);
      showToast('칸반 순서 저장 실패', 'error');
      await refreshNotes();
    } finally {
      setDragId(null);
    }
  }

  return {
    notes,
    loading,
    loadError,
    retryLoad,
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
