'use client';

export function MarginCostThresholdBar({
  warnPct,
  setWarnPct,
  critPct,
  setCritPct,
  showHidden,
  hiddenCount,
  setShowHidden,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        flexWrap: 'wrap',
        margin: '2px 0 10px',
        fontSize: 12,
        color: 'var(--text-3)',
      }}
    >
      <span style={{ fontWeight: 700 }}>원가율 경고선</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        경고 ≥
        <input
          type="number"
          min={0}
          max={100}
          value={warnPct}
          onChange={e => setWarnPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
          style={{
            width: 56,
            padding: '3px 6px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
          }}
        />
        %
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        비상 ≥
        <input
          type="number"
          min={0}
          max={100}
          value={critPct}
          onChange={e => setCritPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
          style={{
            width: 56,
            padding: '3px 6px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
          }}
        />
        %
      </label>
      {hiddenCount > 0 && (
        <button
          className="btn sm"
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowHidden(v => !v)}
        >
          {showHidden ? '숨김 행 감추기' : `숨김 ${hiddenCount}개 보기`}
        </button>
      )}
    </div>
  );
}
