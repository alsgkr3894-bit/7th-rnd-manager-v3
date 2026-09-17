'use client';

import { useEffect, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { deleteMarketResearch, saveMarketResearch } from '@/lib/note/market-research';
import { hasFormContent, withToday } from './marketUtils';
import { findRowById } from './marketPageUtils';

/**
 * 시장조사 작성 모달의 폼 상태와 저장/삭제 액션.
 * - editIdParam: 연구일지 카드의 "수정"(?edit=<id>)으로 들어오면 해당 기록의 폼을 자동으로 연다.
 * - closeDetail: 작성 시작 시 열려 있던 상세 모달을 닫는 page 쪽 콜백.
 */
export function useMarketWriteForm({ canEdit, rows, reload, editIdParam, closeDetail }) {
  const appliedEditIdRef = useRef(null);
  const [form, setForm] = useState(() => withToday());
  const [saving, setSaving] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (!editIdParam || !canEdit) return;
    if (appliedEditIdRef.current === editIdParam) return;
    const target = findRowById(rows, editIdParam);
    if (!target) return;
    appliedEditIdRef.current = editIdParam;
    setForm(withToday(target));
    setWriting(true);
  }, [editIdParam, rows, canEdit]);

  function update(field, value) {
    if (!canEdit) return;
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function startWrite(row = null) {
    if (!canEdit) return;
    closeDetail();
    setForm(withToday(row || {}));
    setWriting(true);
  }

  function closeWrite() {
    setForm(withToday());
    setWriting(false);
  }

  async function handleSave() {
    if (!canEdit) {
      showToast('시장조사 저장은 관리자만 가능합니다', 'warn');
      return;
    }
    if (!hasFormContent(form)) {
      showToast('제목, 시장 흐름, 참고 포인트 또는 사진 중 하나를 입력해주세요', 'warn');
      return;
    }
    setSaving(true);
    try {
      await saveMarketResearch(form);
      showToast(form.id ? '시장조사를 수정했습니다' : '시장조사를 저장했습니다', 'ok');
      closeWrite();
      await reload();
    } catch (error) {
      console.error('[note/market] save failed', error);
      showToast('시장조사 저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!canEdit || row?.id == null) return;
    if (!window.confirm('이 시장조사 기록을 삭제할까요?')) return;
    try {
      await deleteMarketResearch(row.id);
      showToast('삭제했습니다', 'ok');
      if (form.id === row.id) closeWrite();
      await reload();
    } catch (error) {
      console.error('[note/market] delete failed', error);
      showToast('삭제 실패', 'error');
    }
  }

  return { form, saving, writing, update, startWrite, closeWrite, handleSave, handleDelete };
}
