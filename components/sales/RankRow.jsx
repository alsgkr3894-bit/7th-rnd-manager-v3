'use client';
import { memo } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function normalizeShare(value) {
  const share = Number(value);
  if (!Number.isFinite(share)) return 0;
  return Math.max(0, Math.min(1, share));
}

/**
 * RankRow — MonthRankTable의 단일 행 (메인 + 펼친 사이즈 상세)
 *
 * @param {number} rank
 * @param {{ name, category, quantity, sizes }} row
 * @param {number} total — 비중% 계산 기준
 * @param {boolean} expanded
 * @param {() => void} onToggle
 */
export const RankRow = memo(function RankRow({ rank, row, total, expanded, onToggle }) {
  const safeRow = row && typeof row === 'object' ? row : {};
  const name = asDisplayText(safeRow.name, '-');
  const category = asDisplayText(safeRow.category, '-');
  const quantity = Number.isFinite(Number(safeRow.quantity)) ? Number(safeRow.quantity) : 0;
  const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0;
  const sizes = asObjectArray(safeRow.sizes);
  const share = normalizeShare(safeTotal > 0 ? quantity / safeTotal : 0);
  const handleToggle = typeof onToggle === 'function' ? onToggle : undefined;

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: expanded ? 'var(--accent-soft)' : 'var(--surface)',
        transition: 'background 200ms',
      }}
    >
      <button
        className="sales-rank-row-button"
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '50px 1.4fr 90px 110px 1.2fr 80px 30px',
          gap: 12,
          alignItems: 'center',
          padding: '14px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-1)',
          font: 'inherit',
          textAlign: 'left',
        }}
      >
        <div className="num sales-rank-pos" style={{ fontWeight: 700, color: 'var(--text-2)' }}>
          {asDisplayText(rank, '-')}
        </div>
        <div className="sales-rank-name" style={{ fontWeight: 700 }}>
          {name}
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              color: 'var(--text-3)',
              fontWeight: 500,
            }}
          >
            {sizes.length}개 규격
          </span>
        </div>
        <span
          className="chip sales-rank-category"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-2)',
            justifySelf: 'start',
          }}
        >
          {category}
        </span>
        <div className="num right sales-rank-quantity" style={{ textAlign: 'right' }}>
          {formatNumber(quantity)}
          <span className="unit">개</span>
        </div>
        <div className="sales-rank-share" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: 'var(--surface-2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, share * 100)}%`,
                height: '100%',
                background: 'var(--accent)',
              }}
            />
          </div>
          <span className="num" style={{ fontSize: 12, minWidth: 42, textAlign: 'right' }}>
            {(share * 100).toFixed(1)}%
          </span>
        </div>
        <div className="sales-rank-spacer"></div>
        <Icon.chevDown
          className="sales-rank-chevron"
          style={{
            width: 16,
            height: 16,
            color: 'var(--text-3)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms',
          }}
        />
      </button>

      {expanded && <SizeDetail row={safeRow} />}
    </div>
  );
});

function SizeDetail({ row }) {
  const name = asDisplayText(row?.name, '-');
  const sizes = asObjectArray(row?.sizes);
  return (
    <div
      className="sales-rank-size-detail"
      style={{ padding: '4px 12px 14px 62px', borderTop: '1px solid var(--border)' }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '8px 0 6px' }}>
        {name} · 규격별 판매량
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sizes.map((s, index) => {
          const size = asDisplayText(s.size, '-');
          const share = normalizeShare(s.share);
          const quantity = Number.isFinite(Number(s.quantity)) ? Number(s.quantity) : 0;
          return (
            <div
              key={`${size}-${index}`}
              className="sales-rank-size-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px 60px',
                gap: 12,
                alignItems: 'center',
                padding: '6px 0',
                fontSize: 13,
              }}
            >
              <span>
                {name}{' '}
                <span
                  className="chip"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    fontSize: 11,
                    marginLeft: 6,
                  }}
                >
                  {size}
                </span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--surface-2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, share * 100)}%`,
                      height: '100%',
                      background: 'var(--accent)',
                    }}
                  />
                </div>
              </div>
              <div className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                {formatNumber(quantity)}
                <span className="unit">개</span>
              </div>
              <div
                className="num"
                style={{ textAlign: 'right', color: 'var(--text-3)', fontSize: 12 }}
              >
                {(share * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
