import { CalendarGrid } from './CalendarGrid';
import { DayPanel } from './_DayPanel';

export function CalendarWorkspace({
  cells,
  workLogsByDate,
  samplesByDate,
  viewMode,
  selectedDay,
  today,
  animClass,
  calKey,
  panelClosing,
  selectedNotes,
  selectedSchedules,
  selectedWorkLogs,
  selectedSamples,
  onSelectDay,
  onClosePanel,
  onAddSchedule,
  onEditSchedule,
  onOpenNote,
  onOpenSample,
  onAddNote,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr',
        gap: 14,
        alignItems: 'start',
      }}
    >
      <CalendarGrid
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

      {selectedDay && (
        <div
          className={`card ${panelClosing ? 'cal-panel-out' : 'cal-panel'}`}
          style={{ padding: '16px 18px', position: 'sticky', top: 80 }}
        >
          <DayPanel
            dateKey={selectedDay}
            today={today}
            notes={selectedNotes}
            schedules={selectedSchedules}
            workLogs={selectedWorkLogs}
            samples={selectedSamples}
            viewMode={viewMode}
            onClose={onClosePanel}
            onAddSchedule={() => onAddSchedule(selectedDay)}
            onEditSchedule={onEditSchedule}
            onAddNote={() => onAddNote(selectedDay)}
            onOpenNote={onOpenNote}
            onOpenSample={onOpenSample}
          />
        </div>
      )}
    </div>
  );
}
