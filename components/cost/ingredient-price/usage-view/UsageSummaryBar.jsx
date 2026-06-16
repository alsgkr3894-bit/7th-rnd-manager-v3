'use client';

export function UsageSummaryBar({ usageCount, menuCounts }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 10,
        fontSize: 12,
        color: 'var(--text-3)',
        alignItems: 'center',
      }}
    >
      <span>
        사용 식자재 <b style={{ color: 'var(--text-1)' }}>{usageCount}</b>개
      </span>
      <span>·</span>
      <span>
        해당 메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.total}</b>개
      </span>
      <span>·</span>
      <span>
        피자메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.pizza}</b>개
      </span>
      <span>·</span>
      <span>
        사이드메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.side}</b>개
      </span>
    </div>
  );
}
