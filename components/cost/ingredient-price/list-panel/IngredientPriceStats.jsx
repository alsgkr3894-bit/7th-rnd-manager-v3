'use client';

export function IngredientPriceStats({ stats, onDeltaFilter }) {
  return (
    <div className="stat-row">
      <div className="stat-card">
        <div className="stat-label">전체 제품</div>
        <div className="stat-value">
          {stats.total}
          <span className="unit">개</span>
        </div>
      </div>
      <div
        className="stat-card"
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        onClick={() => onDeltaFilter(value => (value === 'up' ? 'all' : 'up'))}
        onKeyDown={event =>
          event.key === 'Enter' && onDeltaFilter(value => (value === 'up' ? 'all' : 'up'))
        }
      >
        <div className="stat-label">단가 인상</div>
        <div
          className="stat-value"
          style={{ color: stats.upCount > 0 ? 'var(--negative, #ef4444)' : undefined }}
        >
          {stats.upCount}
          <span className="unit">개</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>클릭하여 필터</div>
      </div>
      <div
        className="stat-card"
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        onClick={() => onDeltaFilter(value => (value === 'down' ? 'all' : 'down'))}
        onKeyDown={event =>
          event.key === 'Enter' && onDeltaFilter(value => (value === 'down' ? 'all' : 'down'))
        }
      >
        <div className="stat-label">단가 인하</div>
        <div
          className="stat-value"
          style={{ color: stats.downCount > 0 ? 'var(--positive)' : undefined }}
        >
          {stats.downCount}
          <span className="unit">개</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>클릭하여 필터</div>
      </div>
      <div
        className="stat-card"
        style={{ cursor: 'pointer' }}
        onClick={() => onDeltaFilter(value => (value === 'new' ? 'all' : 'new'))}
      >
        <div className="stat-label">신규 항목</div>
        <div
          className="stat-value"
          style={{ color: stats.newCount > 0 ? 'var(--accent)' : undefined }}
        >
          {stats.newCount}
          <span className="unit">개</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>클릭하여 필터</div>
      </div>
    </div>
  );
}
