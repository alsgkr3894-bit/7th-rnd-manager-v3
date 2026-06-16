import { CalendarDayHeader } from './CalendarDayHeader';
import { CalendarItem } from './CalendarItem';
import { WorkLogDots } from './WorkLogDots';

export function CalendarDayCell({
  model,
  onSelectDay,
  onClosePanel,
  onAddSchedule,
  onEditSchedule,
  onOpenNote,
  onOpenSample,
}) {
  return (
    <div
      onClick={() => (model.isSelected ? onClosePanel() : onSelectDay(model.key))}
      style={{
        minHeight: 96,
        padding: '6px 8px',
        borderRight: '1px solid var(--divider)',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer',
        background: model.isSelected
          ? 'var(--accent-soft)'
          : model.hasToday
            ? 'color-mix(in oklab, var(--accent-soft) 45%, var(--surface))'
            : 'var(--surface)',
        transition: 'background 0.12s',
        position: 'relative',
      }}
    >
      <CalendarDayHeader
        model={model}
        onAddSchedule={onAddSchedule}
        onSelectDay={onSelectDay}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {model.shown.map(item => (
          <CalendarItem
            key={`${item._kind}${item.id}_${item._occurrenceDate || item.date || ''}`}
            item={item}
            past={model.past}
            onEditSchedule={onEditSchedule}
            onOpenNote={onOpenNote}
            onOpenSample={onOpenSample}
          />
        ))}
        {model.overflow > 0 && (
          <button
            onClick={event => {
              event.stopPropagation();
              onSelectDay(model.key);
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
            +{model.overflow}개 더보기
          </button>
        )}
      </div>

      {model.cellLogs.length > 0 && <WorkLogDots logs={model.cellLogs} />}
    </div>
  );
}
