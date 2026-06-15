'use client';

import { formatNumber, formatPercent } from '@/lib/format';

export function MenuRecipeSectionHeader({ hasComponents, recipeSummary, saving, onSave }) {
  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-3)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>레시피 구성품</span>
        <button
          type="button"
          className="btn sm"
          onClick={onSave}
          disabled={saving}
          style={{ fontSize: 11 }}
        >
          {saving ? '저장 중…' : '레시피 저장'}
        </button>
      </div>

      {hasComponents && <RecipeSummaryLine recipeSummary={recipeSummary} />}
    </>
  );
}

function RecipeSummaryLine({ recipeSummary }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        fontSize: 11,
        color: 'var(--text-3)',
        margin: '0 0 8px',
      }}
    >
      <span>
        예상 원가{' '}
        <b style={{ color: 'var(--text-1)' }}>{formatNumber(recipeSummary.totalCost)}원</b>
      </span>
      {recipeSummary.costRate != null && (
        <span>원가율 {formatPercent(recipeSummary.costRate)}</span>
      )}
      {recipeSummary.missingQuantityCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>수량 확인 {recipeSummary.missingQuantityCount}</span>
      )}
      {recipeSummary.missingPriceCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>단가 확인 {recipeSummary.missingPriceCount}</span>
      )}
    </div>
  );
}
