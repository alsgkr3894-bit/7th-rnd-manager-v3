import { useState, useRef, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import {
  deleteReport,
  toggleReportFav,
  saveReport,
  pruneOldReports,
  findPrunableReports,
} from '@/lib/report';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function useReportActions({ reload, canEdit = false }) {
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [pruneConfirmOpen, setPruneConfirmOpen] = useState(false);
  const [prunableCount, setPrunableCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef(null);
  const editFocusTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // 언마운트 시 진행 중인 setState 가드 + 포커스 타이머 정리
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (editFocusTimerRef.current) clearTimeout(editFocusTimerRef.current);
    };
  }, []);

  const handleDelete = id => {
    if (!canEdit) return;
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!canEdit) return;
    setDeletingId(id);
    await new Promise(r => setTimeout(r, 360));
    if (!mountedRef.current) return;
    try {
      await deleteReport(id);
      if (!mountedRef.current) return;
      showToast('보고서가 삭제됐어요.', 'ok');
      reload();
    } catch {
      showToast('삭제 중 오류가 발생했어요.', 'error');
    } finally {
      if (mountedRef.current) setDeletingId(null);
    }
  };

  const handlePruneClick = async () => {
    if (!canEdit) return;
    try {
      const list = await findPrunableReports(90);
      setPrunableCount(list.length);
      if (list.length === 0) {
        showToast('90일 이내 보고서만 있습니다. 정리할 항목이 없어요.', 'ok');
      } else {
        setPruneConfirmOpen(true);
      }
    } catch {
      showToast('정리 대상 조회 실패', 'error');
    }
  };

  const confirmPrune = async () => {
    setPruneConfirmOpen(false);
    if (!canEdit) return;
    try {
      await pruneOldReports(90);
      showToast('오래된 보고서가 정리됐어요.', 'ok');
      reload();
    } catch {
      showToast('정리 중 오류가 발생했어요.', 'error');
    }
  };

  const handleToggleFav = async (id, fav) => {
    if (!canEdit) return;
    try {
      await toggleReportFav(id, fav);
      reload();
    } catch {
      showToast('즐겨찾기 변경 중 오류가 발생했어요.', 'error');
    }
  };

  const startEdit = r => {
    if (!canEdit) return;
    setEditingId(r?.id);
    setEditName(asDisplayText(r?.name));
    if (editFocusTimerRef.current) clearTimeout(editFocusTimerRef.current);
    editFocusTimerRef.current = setTimeout(() => {
      editInputRef.current?.focus();
      editFocusTimerRef.current = null;
    }, 50);
  };

  const commitEdit = async r => {
    if (!canEdit) {
      setEditingId(null);
      return;
    }
    const nextName = asDisplayText(editName).trim();
    const prevName = asDisplayText(r?.name);
    if (nextName && nextName !== prevName) {
      try {
        await saveReport({ ...r, name: nextName });
        reload();
      } catch {
        showToast('이름 변경 중 오류가 발생했어요.', 'error');
      }
    }
    setEditingId(null);
  };

  return {
    deletingId,
    confirmDeleteId,
    setConfirmDeleteId,
    pruneConfirmOpen,
    setPruneConfirmOpen,
    prunableCount,
    editingId,
    setEditingId,
    editName,
    setEditName,
    editInputRef,
    handleDelete,
    confirmDelete,
    handlePruneClick,
    confirmPrune,
    handleToggleFav,
    startEdit,
    commitEdit,
  };
}
