import { sampleNamesText } from '@/lib/sample';
import { STATUS_BORDER, STATUS_COLORS } from '@/lib/note/constants';
import { SCHEDULE_COLORS } from '@/lib/note/schedules';
import { WORK_LOG_TYPES } from '@/lib/work-log';
import { WEEKDAYS, dayNumColor, isPast, isToday } from './_calendar-utils';

const MAX_VISIBLE_ITEMS = 3;

export function CalendarGrid({
  cells,
  workLogsByDate,
  samplesByDate,
  viewMode,
  selectedDay,
  today,
  animClass,
  calKey,
  onSelectDay,
  onClosePanel,
  onAddSchedule,
  onEditSchedule,
  onOpenNote,
  onOpenSample,
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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

      <div
        key={calKey.current}
        className={animClass}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}
      >
        {cells.map((cell, index) => {
          if (!cell) return <EmptyCalendarCell key={index} />;

          const { dayNum, key, notes: cellNotes, schedules: cellSchedules, dow } = cell;
          const cellLogs = workLogsByDate.get(key) || [];
          const cellSamples = samplesByDate.get(key) || [];
          const showNotes = viewMode === 'all' || viewMode === 'notes';
          const showSchedules = viewMode === 'all' || viewMode === 'schedules';
          const showSamples = viewMode === 'all' || viewMode === 'samples';
          const visibleNotes = showNotes ? cellNotes : [];
          const visibleSchedules = showSchedules ? cellSchedules : [];
          const visibleSamples = showSamples ? cellSamples : [];
          const isSelected = selectedDay === key;
          const hasToday = isToday(key, today);
          const past = isPast(key, today);
          const total = visibleNotes.length + visibleSchedules.length + visibleSamples.length;
          const shown = [
            ...visibleSchedules.map(schedule => ({ ...schedule, _kind: 'schedule' })),
            ...visibleNotes.map(note => ({ ...note, _kind: 'note' })),
            ...visibleSamples.map(sample => ({ ...sample, _kind: 'sample' })),
          ].slice(0, MAX_VISIBLE_ITEMS);
          const overflow = total - MAX_VISIBLE_ITEMS;

          return (
            <div
              key={key}
              onClick={() => (isSelected ? onClosePanel() : onSelectDay(key))}
              style={{
                minHeight: 90,
                padding: '5px 6px',
                borderRight: '1px solid var(--divider)',
                borderBottom: '1px solid var(--divider)',
                cursor: 'pointer',
                background: isSelected
                  ? 'var(--accent-soft)'
                  : hasToday
                    ? 'color-mix(in oklab, var(--accent-soft) 35%, var(--surface))'
                    : 'var(--surface)',
                transition: 'background 0.12s',
                position: 'relative',
              }}
            >
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
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: hasToday ? 800 : 600,
                    background: hasToday ? 'var(--accent)' : 'transparent',
                    color: dayNumColor({ hasToday, dow, past }),
                  }}
                >
                  {dayNum}
                </span>
                <button
                  onClick={event => {
                    event.stopPropagation();
                    onSelectDay(key);
                    onAddSchedule(key);
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {shown.map(item => (
                  <CalendarItem
                    key={`${item._kind}${item.id}_${item._occurrenceDate || item.date || ''}`}
                    item={item}
                    past={past}
                    onEditSchedule={onEditSchedule}
                    onOpenNote={onOpenNote}
                    onOpenSample={onOpenSample}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onSelectDay(key);
                    }}
                    style={{
                      fontSize: 10,
                      color: 'var(--accent-text)',
                      fontWeight: 600,
                      paddingLeft: 4,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    +{overflow}개 더보기
                  </button>
                )}
              </div>

              {cellLogs.length > 0 && <WorkLogDots logs={cellLogs} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyCalendarCell() {
  return (
    <div
      style={{
        minHeight: 90,
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--divider)',
        borderBottom: '1px solid var(--divider)',
      }}
    />
  );
}

function CalendarItem({ item, past, onEditSchedule, onOpenNote, onOpenSample }) {
  if (item._kind === 'schedule') {
    const color = SCHEDULE_COLORS[item.type] || SCHEDULE_COLORS['기타'];
    return (
      <button
        onClick={event => {
          event.stopPropagation();
          onEditSchedule(item);
        }}
        title={`[${item.type}] ${item.title}${item.time ? ' ' + item.time : ''}${item._isRecurring ? ' (반복)' : ''}`}
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 5px',
          borderRadius: 4,
          background: color.bg,
          color: color.text,
          borderLeft: `2px solid ${color.border}`,
          border: `1px solid transparent`,
          borderLeftWidth: 2,
          borderLeftColor: color.border,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
      >
        {item._isRecurring && <span style={{ opacity: 0.7, marginRight: 2 }}>↻</span>}
        {item.time ? `${item.time} ` : ''}
        {item.title}
      </button>
    );
  }

  if (item._kind === 'sample') {
    const label = sampleNamesText(item) || item.title;
    return (
      <button
        onClick={event => {
          event.stopPropagation();
          onOpenSample(item.id);
        }}
        title={`[샘플] ${label}`}
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 5px',
          borderRadius: 4,
          background: 'var(--positive-soft)',
          color: 'var(--positive)',
          border: '1px solid transparent',
          borderLeftWidth: 2,
          borderLeftColor: 'var(--positive)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
      >
        {label}
      </button>
    );
  }

  const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS['아이디어'];
  const statusBorder = STATUS_BORDER[item.status] || 'var(--border)';
  return (
    <button
      onClick={event => {
        event.stopPropagation();
        onOpenNote(item.id);
      }}
      title={`[${item.status}] ${item.menuName || item.title}`}
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 5px',
        borderRadius: 4,
        background: statusColor.bg,
        color: statusColor.color,
        borderLeft: `2px solid ${statusBorder}`,
        border: `1px solid transparent`,
        borderLeftWidth: 2,
        borderLeftColor: statusBorder,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        opacity: past ? 0.72 : 1,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      {item.menuName || item.title}
    </button>
  );
}

function WorkLogDots({ logs }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
      {[...new Set(logs.map(log => log.type))].slice(0, 4).map(type => {
        const meta = WORK_LOG_TYPES[type] || WORK_LOG_TYPES.OTHER;
        return (
          <span
            key={type}
            title={meta.label}
            style={{
              fontSize: 9,
              background: 'var(--surface-2)',
              borderRadius: 3,
              padding: '1px 4px',
              color: 'var(--text-3)',
              fontWeight: 600,
            }}
          >
            {meta.icon}
          </span>
        );
      })}
    </div>
  );
}
