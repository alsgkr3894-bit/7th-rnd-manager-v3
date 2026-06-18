'use client';
import { useState, useEffect, useCallback } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildSyncPlan, applySyncPlan } from '@/lib/cost/sync-base-quantity';
import { SyncBaseQtyDone } from './sync-base-qty/SyncBaseQtyDone';
import { SyncBaseQtyError } from './sync-base-qty/SyncBaseQtyError';
import { SyncBaseQtyNotice } from './sync-base-qty/SyncBaseQtyNotice';
import { SyncBaseQtyPickStep } from './sync-base-qty/SyncBaseQtyPickStep';
import { SyncBaseQtyPreview } from './sync-base-qty/SyncBaseQtyPreview';

/**
 * 제때 단가 파일의 수량(quantity) 필드를 식자재 기준수량(baseQuantity)으로 동기화하는 모달.
 *
 * 흐름: 파일 선택 → 프리뷰 → 확인 → 완료
 *
 * Props:
 *   onDone  - 적용 완료 시 호출 (count: number)
 *   onClose - 모달 닫기
 */
export function SyncBaseQtyModal({ onDone, onClose }) {
  const [files, setFiles] = useState([]); // 제때 단가 파일 목록
  const [fileId, setFileId] = useState(null); // 선택된 fileId
  const [phase, setPhase] = useState('loading'); // loading | pick | computing | preview | applying | done
  const [plan, setPlan] = useState(null); // buildSyncPlan 결과
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  // ── 파일 목록 초기 로드 ───────────────────────────────────
  useEffect(() => {
    let alive = true;
    getPriceFiles()
      .then(list => {
        if (!alive) return;
        setFiles(list);
        if (list.length > 0) setFileId(list[0].id); // 최신 파일 기본 선택
        setPhase(list.length > 0 ? 'pick' : 'pick');
      })
      .catch(err => {
        if (!alive) return;
        setError(err.message || '파일 목록 로드 실패');
        setPhase('pick');
      });
    return () => {
      alive = false;
    };
  }, []);

  // ── 프리뷰 계산 ───────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    if (!fileId) return;
    setError(null);
    setPhase('computing');
    try {
      const [priceRows, allIngredients] = await Promise.all([
        getPriceRowsByFileId(fileId),
        getAllIngredients(),
      ]);
      const result = buildSyncPlan(priceRows, allIngredients);
      setPlan(result);
      setPhase('preview');
    } catch (err) {
      setError(err.message || '프리뷰 계산 실패');
      setPhase('pick');
    }
  }, [fileId]);

  // ── 적용 ─────────────────────────────────────────────────
  const handleApply = useCallback(async () => {
    if (!plan || plan.changes.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      const count = await applySyncPlan(plan.changes);
      setPhase('done');
      onDone?.(count);
    } catch (err) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setApplying(false);
    }
  }, [plan, onDone]);

  // ── 다시 선택 ─────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPlan(null);
    setError(null);
    setPhase('pick');
  }, []);

  // ── 선택 파일 라벨 ────────────────────────────────────────
  const selectedFile = files.find(f => f.id === fileId);

  return (
    <ModalFrame
      title="제때 수량 → 기준수량 동기화"
      subtitle="제때 단가 파일의 수량(quantity) 값을 식자재 기준수량(baseQuantity)에 덮어씁니다"
      onClose={onClose}
      width="min(680px, 96vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <SyncBaseQtyNotice />

      {(phase === 'pick' || phase === 'computing') && (
        <SyncBaseQtyPickStep
          files={files}
          fileId={fileId}
          phase={phase}
          onFileId={setFileId}
          onPreview={handlePreview}
          onClose={onClose}
        />
      )}

      {phase === 'preview' && plan && (
        <SyncBaseQtyPreview
          plan={plan}
          selectedFile={selectedFile}
          applying={applying}
          onReset={handleReset}
          onApply={handleApply}
        />
      )}

      {phase === 'done' && <SyncBaseQtyDone count={plan?.changes.length ?? 0} onClose={onClose} />}

      <SyncBaseQtyError error={error} />
    </ModalFrame>
  );
}
