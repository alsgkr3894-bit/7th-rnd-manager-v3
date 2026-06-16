import { dayNumColor } from '../_calendar-utils';

export function CalendarDayHeader({ model, onAddSchedule, onSelectDay }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
      }}
    >
      <span
        style={{
          width: model.hasToday ? 24 : 22,
          height: model.hasToday ? 24 : 22,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: model.hasToday ? 13 : 12,
          fontWeight: model.hasToday ? 900 : 600,
          background: model.hasToday ? 'var(--accent)' : 'transparent',
          color: dayNumColor({ hasToday: model.hasToday, dow: model.dow, past: model.past }),
        }}
      >
        {model.dayNum}
      </span>
      <button
        onClick={event => {
          event.stopPropagation();
          onSelectDay(model.key);
          onAddSchedule(model.key);
        }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: 'none',
          background: 'transparent',
          color: 'var(--text-4)',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
        }}
        className="cal-add-btn"
        title="일정 추가"
      >
        +
      </button>
    </div>
  );
}
