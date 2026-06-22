import { isPast, isToday } from '../_calendar-utils';
import { CalendarDayCell } from './CalendarDayCell';
import { EmptyCalendarCell } from './EmptyCalendarCell';
import { buildCalendarCellModel } from './calendarGridUtils';

export function CalendarMonthGrid({
  cells,
  workLogsByDate,
  samplesByDate,
  viewMode,
  selectedDay,
  today,
  animClass,
  calKey,
  canEdit = false,
  onSelectDay,
  onClosePanel,
  onAddSchedule,
  onEditSchedule,
  onOpenNote,
  onOpenSample,
}) {
  return (
    <div
      key={calKey.current}
      className={animClass}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}
    >
      {cells.map((cell, index) => {
        const model = buildCalendarCellModel({
          cell,
          workLogsByDate,
          samplesByDate,
          viewMode,
          selectedDay,
          today,
          isPast,
          isToday,
        });

        if (!model) return <EmptyCalendarCell key={index} />;

        return (
          <CalendarDayCell
            key={model.key}
            model={model}
            canEdit={canEdit}
            onSelectDay={onSelectDay}
            onClosePanel={onClosePanel}
            onAddSchedule={onAddSchedule}
            onEditSchedule={onEditSchedule}
            onOpenNote={onOpenNote}
            onOpenSample={onOpenSample}
          />
        );
      })}
    </div>
  );
}
