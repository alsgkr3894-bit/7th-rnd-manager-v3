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

const COST_RATE_TONE_COLOR = {
  danger: 'var(--negative)',
  warn: 'var(--warn)',
  ok: 'var(--positive)',
};

function RecipeSummaryLine({ recipeSummary }) {
  const costRateColor = COST_RATE_TONE_COLOR[recipeSummary.costRateTone] || 'var(--text-2)';

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
      {recipeSummary.commonGroupCount > 0 ? (
        <span>
          직접 원가{' '}
          <b style={{ color: 'var(--text-1)' }}>{formatNumber(recipeSummary.directCost)}원</b>
          {' + '}
          공통원가{' '}
          <b style={{ color: 'var(--text-1)' }}>{formatNumber(recipeSummary.commonGroupCost)}원</b>
          {' = '}총{' '}
          <b style={{ color: 'var(--text-1)' }}>{formatNumber(recipeSummary.totalCost)}원</b>
        </span>
      ) : (
        <span>
          예상 원가{' '}
          <b style={{ color: 'var(--text-1)' }}>{formatNumber(recipeSummary.totalCost)}원</b>
        </span>
      )}
      {recipeSummary.costRate != null && (
        <span style={{ color: costRateColor, fontWeight: 600 }}>
          원가율 {formatPercent(recipeSummary.costRate)}
        </span>
      )}
      {recipeSummary.marginAmount != null && (
        <span>
          예상 마진{' '}
          <b
            style={{
              color: recipeSummary.marginAmount >= 0 ? 'var(--positive)' : 'var(--negative)',
            }}
          >
            {formatNumber(recipeSummary.marginAmount)}원
          </b>
        </span>
      )}
      {recipeSummary.missingQuantityCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>수량 확인 {recipeSummary.missingQuantityCount}</span>
      )}
      {recipeSummary.missingPriceCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>단가 확인 {recipeSummary.missingPriceCount}</span>
      )}
      {recipeSummary.commonGroupCount > 0 && (
        <span style={{ color: 'var(--text-4)' }}>
          공통묶음 {recipeSummary.commonGroupCount}개 포함
        </span>
      )}
    </div>
  );
}
