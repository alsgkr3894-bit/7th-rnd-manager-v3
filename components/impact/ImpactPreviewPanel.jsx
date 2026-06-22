'use client';
import { useEffect, useState } from 'react';
import { computeIngredientPriceImpact } from '@/lib/impact/ingredient-impact';

function toFiniteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * ImpactPreviewPanel — 식자재 단가 변경 시 영향 메뉴 미리보기
 *
 * Props:
 *   productCode: string — 변경할 식자재 제품코드
 *   oldPrice: number|null — 기존 포장가
 *   newPrice: number|null — 변경 후 포장가
 *   oldBaseQuantity: number|null — 기존 포장수량
 *   newBaseQuantity: number|null — 변경 후 포장수량
 *
 * 포장가와 포장수량이 모두 유효할 때 레시피 단위단가 변화로 영향도를 계산한다.
 */
export function ImpactPreviewPanel({
  productCode,
  oldPrice,
  newPrice,
  oldBaseQuantity,
  newBaseQuantity,
}) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const oldNum = toFiniteNumber(oldPrice);
  const newNum = toFiniteNumber(newPrice);
  const oldBaseNum = toFiniteNumber(oldBaseQuantity);
  const newBaseNum = toFiniteNumber(newBaseQuantity);

  const hasDelta =
    oldNum != null &&
    newNum != null &&
    oldBaseNum != null &&
    oldBaseNum > 0 &&
    newBaseNum != null &&
    newBaseNum > 0 &&
    (oldNum !== newNum || oldBaseNum !== newBaseNum);

  useEffect(() => {
    if (!productCode || !hasDelta) {
      setResult(null);
      return;
    }

    let aborted = false;
    setLoading(true);
    setResult(null);

    computeIngredientPriceImpact(productCode, oldNum, newNum, {
      oldBaseQuantity: oldBaseNum,
      newBaseQuantity: newBaseNum,
    })
      .then(r => {
        if (!aborted) setResult(r);
      })
      .catch(() => {
        if (!aborted) setResult(null);
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [productCode, hasDelta, oldNum, newNum, oldBaseNum, newBaseNum]);

  if (!hasDelta || (!loading && (!result || result.totalAffected === 0))) return null;

  const unitDeltaSign = (result?.unitPriceDelta ?? 0) > 0 ? '+' : '';
  const affectedCount = result?.totalAffected ?? 0;
  const costDelta = result?.unitPriceDelta ?? result?.priceDelta ?? 0;

  return (
    <div
      style={{
        border: '1px solid var(--divider)',
        borderRadius: 8,
        overflow: 'hidden',
        fontSize: 13,
      }}
    >
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: loading
            ? 'var(--surface-2)'
            : costDelta > 0
              ? 'var(--warn-soft)'
              : 'var(--accent-soft)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text)',
        }}
      >
        <span style={{ fontWeight: 600, flex: 1 }}>
          {loading ? '영향 메뉴 계산 중…' : `단가 변경 시 ${affectedCount}개 메뉴 원가율 변경`}
        </span>
        {!loading && result?.unitPriceDelta != null && (
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            단위 {unitDeltaSign}
            {result.unitPriceDelta.toLocaleString()}원{' '}
            {result.unitPriceDeltaPct != null &&
              `(${result.unitPriceDeltaPct > 0 ? '+' : ''}${result.unitPriceDeltaPct.toFixed(1)}%)`}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && !loading && result && result.affectedMenus.length > 0 && (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                <th style={TH}>메뉴명</th>
                <th style={{ ...TH, textAlign: 'right' }}>현재 원가율</th>
                <th style={{ ...TH, textAlign: 'right' }}>변경 후</th>
                <th style={{ ...TH, textAlign: 'right' }}>변화량</th>
              </tr>
            </thead>
            <tbody>
              {result.affectedMenus.map(m => {
                const deltaColor =
                  m.delta == null
                    ? 'var(--text-3)'
                    : m.delta > 0
                      ? 'var(--negative)'
                      : 'var(--positive)';
                return (
                  <tr key={m.menuCode} style={{ borderTop: '1px solid var(--divider)' }}>
                    <td style={TD}>
                      <div style={{ fontWeight: 500 }}>{m.menuName}</div>
                      <div style={{ color: 'var(--text-3)', fontSize: 11 }}>{m.menuCode}</div>
                    </td>
                    <td style={{ ...TD, textAlign: 'right', color: 'var(--text-2)' }}>
                      {m.oldCostRate != null ? `${m.oldCostRate.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', color: 'var(--text-2)' }}>
                      {m.newCostRate != null ? `${m.newCostRate.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', color: deltaColor, fontWeight: 600 }}>
                      {m.delta != null ? `${m.delta > 0 ? '+' : ''}${m.delta.toFixed(1)}%p` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TH = {
  padding: '6px 10px',
  fontWeight: 600,
  color: 'var(--text-2)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const TD = { padding: '6px 10px', verticalAlign: 'middle' };
