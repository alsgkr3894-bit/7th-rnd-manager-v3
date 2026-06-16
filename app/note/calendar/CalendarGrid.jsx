import { CalendarMonthGrid } from './calendar-grid/CalendarMonthGrid';
import { CalendarWeekHeader } from './calendar-grid/CalendarWeekHeader';

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
      <CalendarWeekHeader />
      <CalendarMonthGrid
        cells={cells}
        workLogsByDate={workLogsByDate}
        samplesByDate={samplesByDate}
        viewMode={viewMode}
        selectedDay={selectedDay}
        today={today}
        animClass={animClass}
        calKey={calKey}
        onSelectDay={onSelectDay}
        onClosePanel={onClosePanel}
        onAddSchedule={onAddSchedule}
        onEditSchedule={onEditSchedule}
        onOpenNote={onOpenNote}
        onOpenSample={onOpenSample}
      />
    </div>
  );
}
