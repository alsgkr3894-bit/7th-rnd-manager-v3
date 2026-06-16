'use client';
import { useState, useCallback, useMemo } from 'react';
import { showToast } from '@/components/Toast';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { readSpreadsheetFile } from '@/lib/excel';
import { parseBulkPriceRows, matchAndApply, commitBulkPrice } from '@/lib/cost/bulk-price-update';
import { asObjectArray, noop } from '@/lib/ui/prop-guards';
import { BulkPriceDoneState } from './bulk-price/BulkPriceDoneState';
import { BulkPriceErrorBanner } from './bulk-price/BulkPriceErrorBanner';
import { BulkPriceFormatHint } from './bulk-price/BulkPriceFormatHint';
import { BulkPriceIdleDropzone } from './bulk-price/BulkPriceIdleDropzone';
import { BulkPriceParsingState } from './bulk-price/BulkPriceParsingState';
import { BulkPricePreview } from './bulk-price/BulkPricePreview';
import { normalizeBulkPricePreview } from './bulk-price/bulkPriceModalUtils';

// ── 메인 컴포넌트 ─────────────────────────────────────────────

/**
 * 식자재 일괄 가격 업로드 모달.
 *
 * Props:
 *   existingIngredients  - cost_ingredients 전체 레코드 배열
 *   onDone               - 커밋 성공 시 호출 (부모가 목록 새로고침)
 *   onClose              - 모달 닫기
 */
export function BulkPriceModal({ existingIngredients, onDone, onClose }) {
  const safeExistingIngredients = useMemo(
    () => asObjectArray(existingIngredients),
    [existingIngredients]
  );
  const close = typeof onClose === 'function' ? onClose : noop;

  const [phase, setPhase] = useState('idle'); // idle | parsing | preview | committing | done
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null); // { matched, unmatched }
  const [committing, setCommitting] = useState(false);

  // ── 파일 선택 처리 ────────────────────────────────────────
  const handleFile = useCallback(
    async file => {
      if (!file) return;
      setError(null);
      setFileName(file.name);
      setPhase('parsing');
      try {
        const { rows } = await readSpreadsheetFile(file);
        if (!rows || rows.length === 0) throw new Error('파일에 데이터 행이 없습니다.');

        const parsed = parseBulkPriceRows(rows);
        if (parsed.length === 0) {
          throw new Error(
            '유효한 행을 찾지 못했습니다. 예상 컬럼: 상품코드(필수), 단가(필수), 재료명(선택).'
          );
        }

        const diff = matchAndApply(parsed, safeExistingIngredients);
        setPreview(diff);
        setPhase('preview');
      } catch (e) {
        setError(e?.message || '파일 파싱 중 오류가 발생했습니다.');
        setPhase('idle');
      }
    },
    [safeExistingIngredients]
  );

  // ── 커밋 ────────────────────────────────────────────────
  const handleCommit = useCallback(async () => {
    const { matched } = normalizeBulkPricePreview(preview);
    if (matched.length === 0) return;
    setCommitting(true);
    setError(null);
    try {
      const result = await commitBulkPrice(matched);
      const { applied, skipped } =
        typeof result === 'object' ? result : { applied: result, skipped: 0 };
      setPhase('done');
      if (skipped > 0) {
        showToast(`${applied}개 적용 완료 · ${skipped}개 건너뜀 (동시 삭제)`, 'warn');
      }
      onDone?.(applied);
    } catch (e) {
      setError(e?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setCommitting(false);
    }
  }, [preview, onDone]);

  // ── 재선택 ───────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase('idle');
    setPreview(null);
    setFileName('');
    setError(null);
  }, []);

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <ModalFrame
      title="일괄 가격 업로드"
      subtitle="CSV 또는 Excel 파일로 식자재 단가를 한 번에 업데이트합니다"
      onClose={close}
      width="min(720px, 96vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <BulkPriceFormatHint />

      {phase === 'idle' && (
        <BulkPriceIdleDropzone onFile={handleFile} onError={setError} />
      )}

      {phase === 'parsing' && (
        <BulkPriceParsingState fileName={fileName} />
      )}

      {phase === 'preview' && preview && (
        <BulkPricePreview
          fileName={fileName}
          preview={preview}
          committing={committing}
          onReset={handleReset}
          onCommit={handleCommit}
        />
      )}

      {phase === 'done' && (
        <BulkPriceDoneState preview={preview} onClose={close} />
      )}

      <BulkPriceErrorBanner error={error} />
    </ModalFrame>
  );
}
