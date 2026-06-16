import { WEEKDAYS } from '../_calendar-utils';

export function CalendarWeekHeader() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7,1fr)',
        borderBottom: '1px solid var(--divider)',
      }}
    >
      {WEEKDAYS.map((weekday, index) => (
        <div
          key={weekday}
          style={{
            padding: '10px 0',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.03em',
            color: index === 0 ? '#EF4444' : index === 6 ? '#3B82F6' : 'var(--text-3)',
          }}
        >
          {weekday}
        </div>
      ))}
    </div>
  );
}
