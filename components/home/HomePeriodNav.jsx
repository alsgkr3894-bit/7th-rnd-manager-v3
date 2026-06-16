export function HomePeriodNav({ detectedPeriod, anchor, onShiftAnchor, onResetAnchor }) {
  if (!detectedPeriod) return null;

  const activePeriod = anchor || detectedPeriod;

  return (
    <div className="home-period-nav">
      <button type="button" className="btn sm" onClick={() => onShiftAnchor(-1)} title="이전 달">
        ←
      </button>
      <span className="home-period-label">
        {activePeriod.year}년 {activePeriod.month}월
      </span>
      <button
        type="button"
        className="btn sm"
        onClick={() => onShiftAnchor(1)}
        title="다음 달"
        disabled={!anchor}
      >
        →
      </button>
      {anchor && (
        <button
          type="button"
          className="btn sm"
          style={{ color: 'var(--accent)', fontWeight: 600 }}
          onClick={onResetAnchor}
        >
          최신
        </button>
      )}
    </div>
  );
}
