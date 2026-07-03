'use client';

import { Icon } from '@/components/icons';
import { formatNumber, formatPercent } from '@/lib/format';

export function MenuRecipeSectionHeader({
  hasComponents,
  recipeSummary,
  copyOpen,
  onToggleCopy,
  onlyMissingPrice = false,
  missingPriceFilterCount = 0,
  onToggleMissingPrice,
}) {
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
          gap: 6,
        }}
      >
        <span>레시피 구성품</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {hasComponents && typeof onToggleMissingPrice === 'function' && (
            <button
              type="button"
              className={'btn sm' + (onlyMissingPrice ? ' active' : '')}
              onClick={onToggleMissingPrice}
              disabled={!onlyMissingPrice && missingPriceFilterCount <= 0}
              title={onlyMissingPrice ? '전체 구성품 보기' : '단가가 없는 구성품만 빠르게 확인'}
              style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Icon.alert style={{ width: 12, height: 12 }} />
              {onlyMissingPrice ? '전체 보기' : `단가 없음 ${missingPriceFilterCount}`}
            </button>
          )}
          <button
            type="button"
            className={'btn sm' + (copyOpen ? ' active' : '')}
            onClick={onToggleCopy}
            style={{ fontSize: 11 }}
          >
            다른 메뉴에서 복사
          </button>
        </div>
      </div>

      {hasComponents && <RecipeSummaryCards recipeSummary={recipeSummary} />}
      {hasComponents && <RecipeSummaryLine recipeSummary={recipeSummary} />}
    </>
  );
}

const COST_RATE_TONE_COLOR = {
  danger: 'var(--negative)',
  warn: 'var(--warn)',
  ok: 'var(--positive)',
};

function SummaryCard({ label, value, tone = 'default' }) {
  const color =
    tone === 'warn'
      ? 'var(--warn)'
      : tone === 'positive'
        ? 'var(--positive)'
        : tone === 'negative'
          ? 'var(--negative)'
          : 'var(--text-1)';
  return (
    <span
      style={{
        minWidth: 108,
        border: '1px solid var(--divider)',
        borderRadius: 7,
        background: 'var(--surface-2)',
        padding: '8px 10px',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-4)',
          marginBottom: 3,
        }}
      >
        {label}
      </span>
      <b style={{ display: 'block', fontSize: 13, color }}>{value}</b>
    </span>
  );
}

function RecipeSummaryCards({ recipeSummary }) {
  const marginTone =
    recipeSummary.marginAmount == null
      ? 'default'
      : recipeSummary.marginAmount >= 0
        ? 'positive'
        : 'negative';
  const rateTone =
    recipeSummary.costRateTone === 'danger' || recipeSummary.costRateTone === 'warn'
      ? 'warn'
      : 'default';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
      }}
    >
      <SummaryCard label="구성품" value={`${recipeSummary.directComponentCount || 0}개`} />
      <SummaryCard label="예상 원가" value={`${formatNumber(recipeSummary.totalCost)}원`} />
      <SummaryCard
        label="원가율"
        value={recipeSummary.costRate == null ? '—' : formatPercent(recipeSummary.costRate)}
        tone={rateTone}
      />
      <SummaryCard
        label="예상 마진"
        value={
          recipeSummary.marginAmount == null ? '—' : `${formatNumber(recipeSummary.marginAmount)}원`
        }
        tone={marginTone}
      />
    </div>
  );
}

function RecipeSummaryLine({ recipeSummary }) {
  const costRateColor = COST_RATE_TONE_COLOR[recipeSummary.costRateTone] || 'var(--text-2)';
  const missingDirectQuantityCount = recipeSummary.missingDirectQuantityCount || 0;
  const missingCommonQuantityCount = recipeSummary.missingCommonQuantityCount || 0;
  const missingDirectPriceCount = recipeSummary.missingDirectPriceCount || 0;
  const missingCommonPriceCount = recipeSummary.missingCommonPriceCount || 0;

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
      {missingDirectQuantityCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>레시피 수량 확인 {missingDirectQuantityCount}</span>
      )}
      {missingCommonQuantityCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>
          공통원가 수량 확인 {missingCommonQuantityCount}
        </span>
      )}
      {missingDirectPriceCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>레시피 단가 확인 {missingDirectPriceCount}</span>
      )}
      {missingCommonPriceCount > 0 && (
        <span style={{ color: 'var(--warn)' }}>공통원가 단가 확인 {missingCommonPriceCount}</span>
      )}
      {recipeSummary.commonGroupCount > 0 && (
        <span style={{ color: 'var(--text-4)' }}>
          공통묶음 {recipeSummary.commonGroupCount}개 포함
        </span>
      )}
    </div>
  );
}
