import { Icon } from '@/components/icons';

export const CALENDAR_VIEW_MODES = [
  ['all', '전체'],
  ['notes', '노트'],
  ['schedules', '일정'],
  ['samples', '샘플'],
];

export function CalendarToolbar({
  viewYear,
  viewMonth,
  monthStats,
  viewMode,
  onViewMode,
  onShiftMonth,
  onResetToToday,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          className="btn sm"
          aria-label="이전 달"
          onClick={() => onShiftMonth(-1)}
        >
          <Icon.chevLeft style={{ width: 14, height: 14 }} />
        </button>
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            minWidth: 108,
            textAlign: 'center',
          }}
        >
          {viewYear}년 {viewMonth}월
        </span>
        <button
          type="button"
          className="btn sm"
          aria-label="다음 달"
          onClick={() => onShiftMonth(1)}
        >
          <Icon.chevRight style={{ width: 14, height: 14 }} />
        </button>
        <button
          type="button"
          className="btn sm ghost"
          style={{ fontSize: 11 }}
          onClick={onResetToToday}
        >
          오늘
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
        {monthStats.noteDone > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
            테스트 <b style={{ color: 'var(--text-1)' }}>{monthStats.noteDone}</b>건
          </span>
        )}
        {monthStats.noteScheduled > 0 && (
          <span style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>
            예정 <b>{monthStats.noteScheduled}</b>건
          </span>
        )}
        {monthStats.eventTotal > 0 && (
          <span style={{ fontSize: 12, color: 'var(--color-reporting)', fontWeight: 600 }}>
            일정 <b>{monthStats.eventTotal}</b>건
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {CALENDAR_VIEW_MODES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onViewMode(key)}
            style={{
              minHeight: 32,
              padding: '6px 13px',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === key ? 'var(--accent)' : 'var(--surface-2)',
              color: viewMode === key ? 'var(--surface)' : 'var(--text-3)',
              transition: 'background 0.12s',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
