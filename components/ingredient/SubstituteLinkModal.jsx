'use client';
import { useEffect, useMemo, useState } from 'react';
import { ComboBox } from '@/components/ui/ComboBox';
import { useModalShell } from '@/hooks/useModalShell';
import { OVERLAY_COLOR } from '@/lib/ui/styles';
import { previewIngredientProductReplace } from '@/lib/ingredient';

function rowLabel(row) {
  return row?.ingredientName || row?.displayName || row?.productName || row?.productCode || '';
}

function rowCode(row) {
  return String(row?.productCode || '').trim();
}

function optionLabel(row) {
  const label = rowLabel(row);
  const code = rowCode(row);
  if (!label && !code) return '';
  if (!code) return label;
  return `${label} (${code})`;
}

/**
 * 대체상품 연결 모달 — 식자재 하나를 선택해 다른(이미 등록된) 식자재로 대체 연결한다.
 * 확인 시 replaceIngredientProductCode가 이전 정보 이관 + 레시피/세트/엣지 재연결 +
 * 기존 항목 단종 처리까지 한 트랜잭션으로 수행한다.
 */
export function SubstituteLinkModal({ open, sourceRow, candidates = [], onConfirm, onClose }) {
  if (!open) return null;
  return (
    <SubstituteLinkModalBody
      sourceRow={sourceRow}
      candidates={candidates}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

function SubstituteLinkModalBody({ sourceRow, candidates, onConfirm, onClose }) {
  const { containerRef, isClosing, close } = useModalShell(onClose);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const sourceCode = rowCode(sourceRow);
  const options = useMemo(
    () =>
      (candidates || [])
        .filter(
          row => rowCode(row) && rowCode(row) !== sourceCode && !row.discontinued && !row.excluded
        )
        .sort((a, b) => rowLabel(a).localeCompare(rowLabel(b), 'ko')),
    [candidates, sourceCode]
  );
  const optionLabels = useMemo(() => options.map(optionLabel).filter(Boolean), [options]);
  const target = useMemo(
    () => options.find(row => optionLabel(row) === query.trim()) || null,
    [options, query]
  );

  useEffect(() => {
    if (!target) {
      setPreview(null);
      return;
    }
    let alive = true;
    setPreviewLoading(true);
    previewIngredientProductReplace(sourceCode)
      .then(result => {
        if (alive) setPreview(result);
      })
      .catch(() => {
        if (alive) setPreview(null);
      })
      .finally(() => {
        if (alive) setPreviewLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [target, sourceCode]);

  async function handleConfirm() {
    if (!target || confirming) return;
    setConfirming(true);
    try {
      await onConfirm(target);
      close();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: OVERLAY_COLOR,
        zIndex: 600,
        display: 'grid',
        placeItems: 'center',
        animation: 'fade 150ms ease',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="substitute-link-title"
        className={'card modal-anim' + (isClosing ? ' modal-exit' : '')}
        style={{ width: 'min(460px,92vw)', padding: '24px 24px 20px' }}
      >
        <div
          id="substitute-link-title"
          style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-1)', marginBottom: 6 }}
        >
          대체상품 연결
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          <b>{rowLabel(sourceRow)}</b>
          {sourceCode && <span style={{ color: 'var(--text-3)' }}> ({sourceCode})</span>}을(를)
          대신할 식자재를 선택하세요. 선택한 식자재의 카테고리·태그·원산지·알레르기 정보가 없으면
          기존 항목의 정보를 이어받습니다.
        </div>

        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-2)',
            marginBottom: 6,
          }}
        >
          대체할 식자재 검색
        </label>
        {options.length > 0 ? (
          <ComboBox
            value={query}
            onChange={setQuery}
            options={optionLabels}
            placeholder="식자재명 또는 제품코드 검색"
            inputClassName="form-input"
            maxItems={8}
            style={{ width: '100%' }}
          />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            연결할 수 있는 다른 식자재가 없습니다.
          </div>
        )}

        {target && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--warn-soft)',
              color: 'var(--text-2)',
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            {previewLoading ? (
              '영향 범위 확인 중…'
            ) : preview ? (
              <>
                연결하면 레시피 {preview.menuRecipeCount}개 · 세트/그룹 {preview.recipeGroupCount}개
                · 엣지/도우 {preview.edgeCount}개가 자동으로 <b>{rowLabel(target)}</b>(으)로
                재연결되고, <b>{rowLabel(sourceRow)}</b>은(는) 단종 처리됩니다.
              </>
            ) : (
              '영향 범위를 확인하지 못했습니다.'
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={close} disabled={confirming}>
            취소
          </button>
          <button
            className="btn primary"
            onClick={handleConfirm}
            disabled={!target || confirming || previewLoading}
          >
            {confirming ? '연결 중…' : '대체 연결'}
          </button>
        </div>
      </div>
    </div>
  );
}
