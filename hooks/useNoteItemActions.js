'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { sharedRestoreRecord as restoreRecord } from '@/lib/db/shared';
import {
  addNote,
  deleteNote,
  updateNoteChainStatus,
  updateNoteChainType,
  invalidateNotesCache,
} from '@/lib/note';
import { setNoteFrom, setSampleFrom } from '@/lib/note/keys';
import { isUnifiedSampleRecord, unifiedSampleSourceId } from '@/lib/note/unified-records';
import { addSample, deleteSample, updateSample, updateSampleStatus } from '@/lib/sample';

async function restoreDeletedNotes(records = []) {
  const failures = [];
  let restoredCount = 0;
  for (const rec of records) {
    try {
      await restoreRecord('menu_dev_notes', rec);
      restoredCount++;
    } catch (err) {
      failures.push(err);
    }
  }
  if (restoredCount > 0) invalidateNotesCache();
  if (failures.length > 0) {
    throw new Error(`${failures.length}개 노트 복구 실패`);
  }
}

export function useNoteItemActions({
  router,
  setNotes,
  load,
  detailNote,
  setDetailNote,
  canEdit = false,
}) {
  const [popIds, setPopIds] = useState(new Set());
  const [singleDeleteNote, setSingleDeleteNote] = useState(null);
  const popTimersRef = useRef(new Set());

  useEffect(
    () => () => {
      popTimersRef.current.forEach(timer => clearTimeout(timer));
      popTimersRef.current.clear();
    },
    []
  );

  const handleDelete = useCallback(
    function handleDelete(note, e) {
      e?.stopPropagation();
      if (!canEdit) return;
      setSingleDeleteNote(note);
    },
    [canEdit]
  );

  const execDelete = useCallback(
    async function execDelete(note) {
      setSingleDeleteNote(null);
      if (!canEdit) return;
      try {
        if (isUnifiedSampleRecord(note)) {
          const sourceId = unifiedSampleSourceId(note);
          await deleteSample(sourceId);
          setNotes(prev => prev.filter(n => n.id !== note.id));
          if (detailNote?.id === note.id) setDetailNote(null);
          showToast('샘플/제품이슈 기록을 삭제했어요', 'ok');
          return;
        }

        const removed = await deleteNote(note.id);
        const removedIds = new Set((removed || []).map(rec => rec.id));
        setNotes(prev => prev.filter(n => !removedIds.has(n.id)));
        if (detailNote?.id === note.id) setDetailNote(null);
        const childCount = (removed?.length ?? 1) - 1;
        const base = note.title?.trim() ? `"${note.title}" 삭제됨` : '노트 삭제됨';
        const label = childCount > 0 ? `${base} (하위 ${childCount}개 포함)` : base;
        showToast(label, 'ok', 5000, {
          label: '실행취소',
          onClick: async () => {
            try {
              await restoreDeletedNotes(removed || []);
              await load();
              showToast('삭제를 되돌렸습니다', 'ok');
            } catch (err) {
              console.error('[useNoteItemActions] undo delete failed', err);
              showToast('실행취소 실패: ' + err.message, 'error');
              await load();
            }
          },
        });
      } catch (err) {
        console.error('[useNoteItemActions] deleteNote', err);
        showToast('삭제 실패', 'error');
      }
    },
    [canEdit, detailNote?.id, load, setDetailNote, setNotes]
  );

  const handleCopy = useCallback(
    async function handleCopy(note, e) {
      e?.stopPropagation();
      if (!canEdit) return;
      try {
        await initDB();
        if (isUnifiedSampleRecord(note)) {
          const source = note._sourceRecord || {};
          await addSample({
            ...source,
            title: `${source.title || note.title || '샘플 기록'} (복사)`,
            parentId: null,
          });
          showToast('샘플/제품이슈 기록을 복사했어요', 'ok');
          load();
          return;
        }

        await addNote({
          ...note,
          title: `${note.title} (복사)`,
          createdAt: undefined,
          parentId: null,
        });
        showToast('노트를 복사했어요', 'ok');
        load();
      } catch (err) {
        console.error('[useNoteItemActions] handleCopy', err);
        showToast('복사 실패', 'error');
      }
    },
    [canEdit, load]
  );

  const handleStatusChange = useCallback(
    async function handleStatusChange(noteId, newStatus, e) {
      e?.stopPropagation();
      if (!canEdit) return;
      try {
        let changedIds;
        if (isUnifiedSampleRecord(noteId)) {
          // 샘플/제품이슈 레코드는 sample_records에 저장 — 개별 샘플 상태를 갱신한다.
          await updateSampleStatus(unifiedSampleSourceId(noteId), newStatus);
          changedIds = [noteId];
        } else {
          changedIds = await updateNoteChainStatus(noteId, newStatus);
        }
        const changedSet = new Set(changedIds);
        showToast(`메뉴 상태 → ${newStatus}`, 'ok');
        setNotes(prev => prev.map(n => (changedSet.has(n.id) ? { ...n, status: newStatus } : n)));
        setPopIds(s => new Set([...s, ...changedIds]));
        const timer = setTimeout(() => {
          setPopIds(s => {
            const n = new Set(s);
            changedIds.forEach(id => n.delete(id));
            return n;
          });
          popTimersRef.current.delete(timer);
        }, 400);
        popTimersRef.current.add(timer);
        setDetailNote(n => (n && changedSet.has(n.id) ? { ...n, status: newStatus } : n));
      } catch (err) {
        console.error('[useNoteItemActions] handleStatusChange', err);
        showToast('상태 변경 실패', 'error');
      }
    },
    [canEdit, setDetailNote, setNotes]
  );

  const handleTypeChange = useCallback(
    async function handleTypeChange(noteId, newType, e) {
      e?.stopPropagation();
      if (!canEdit) return;
      try {
        let changedIds;
        if (isUnifiedSampleRecord(noteId)) {
          // 샘플/제품이슈는 recordType 전환(단일 레코드) — sample_records에 저장.
          await updateSample(unifiedSampleSourceId(noteId), { recordType: newType });
          changedIds = [noteId];
        } else {
          changedIds = await updateNoteChainType(noteId, newType);
        }
        const changedSet = new Set(changedIds);
        showToast(`유형 → ${newType}`, 'ok');
        setNotes(prev => prev.map(n => (changedSet.has(n.id) ? { ...n, noteType: newType } : n)));
        setPopIds(s => new Set([...s, ...changedIds]));
        const timer = setTimeout(() => {
          setPopIds(s => {
            const n = new Set(s);
            changedIds.forEach(id => n.delete(id));
            return n;
          });
          popTimersRef.current.delete(timer);
        }, 400);
        popTimersRef.current.add(timer);
        setDetailNote(n => (n && changedSet.has(n.id) ? { ...n, noteType: newType } : n));
      } catch (err) {
        console.error('[useNoteItemActions] handleTypeChange', err);
        showToast('유형 변경 실패', 'error');
      }
    },
    [canEdit, setDetailNote, setNotes]
  );

  const handleNewVersion = useCallback(
    function handleNewVersion(note, e) {
      e?.stopPropagation();
      if (!canEdit) return;
      if (isUnifiedSampleRecord(note)) {
        setSampleFrom(unifiedSampleSourceId(note));
        router.push('/note/write?type=sample');
        return;
      }
      setNoteFrom(note.id);
      router.push('/note/write');
    },
    [canEdit, router]
  );

  return {
    popIds,
    singleDeleteNote,
    setSingleDeleteNote,
    handleDelete,
    execDelete,
    handleCopy,
    handleStatusChange,
    handleTypeChange,
    handleNewVersion,
  };
}
