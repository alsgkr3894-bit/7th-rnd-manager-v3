'use client';

import { useCallback } from 'react';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { addSample, updateSample, deleteSample } from '@/lib/sample';

export function useSampleRecordActions({
  setSamples,
  setDetailRec,
  reload,
  showConfirm,
  canEdit = false,
}) {
  const handleDelete = useCallback(
    async sample => {
      if (!canEdit) return;
      const name = sample.title?.trim() || '샘플';
      const ok = await showConfirm({
        message: `'${name}' 기록이 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?`,
        danger: true,
      });
      if (!ok) return;
      try {
        await deleteSample(sample.id);
        setSamples(prev => prev.filter(item => item.id !== sample.id));
        setDetailRec(null);
        const label = sample.title?.trim() ? `"${sample.title}" 삭제됨` : '샘플 삭제됨';
        showToast(label, 'ok');
      } catch {
        showToast('삭제 실패', 'error');
      }
    },
    [canEdit, setDetailRec, setSamples, showConfirm]
  );

  const handleCopy = useCallback(
    async (sample, event) => {
      event?.stopPropagation();
      if (!canEdit) return;
      try {
        await initDB();
        await addSample({ ...sample, title: `${sample.title} (복사)`, parentId: null });
        showToast('샘플을 복사했어요', 'ok');
        reload();
      } catch {
        showToast('복사 실패', 'error');
      }
    },
    [canEdit, reload]
  );

  const handleRatingChange = useCallback(
    async (sampleId, newRating, event) => {
      event?.stopPropagation();
      if (!canEdit) return;
      try {
        await initDB();
        await updateSample(sampleId, { rating: newRating });
        setSamples(prev =>
          prev.map(sample => (sample.id === sampleId ? { ...sample, rating: newRating } : sample))
        );
        showToast('별점 수정됨', 'ok', 1500);
      } catch {
        showToast('별점 변경 실패', 'error');
      }
    },
    [canEdit, setSamples]
  );

  return {
    handleDelete,
    handleCopy,
    handleRatingChange,
  };
}
