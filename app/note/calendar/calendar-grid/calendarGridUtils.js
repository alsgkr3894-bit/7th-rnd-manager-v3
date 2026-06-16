export const MAX_VISIBLE_ITEMS = 3;

export function shouldShowCalendarKind(viewMode, kind) {
  return viewMode === 'all' || viewMode === kind;
}

export function buildVisibleCalendarItems({ notes = [], schedules = [], samples = [], viewMode }) {
  const visibleNotes = shouldShowCalendarKind(viewMode, 'notes') ? notes : [];
  const visibleSchedules = shouldShowCalendarKind(viewMode, 'schedules') ? schedules : [];
  const visibleSamples = shouldShowCalendarKind(viewMode, 'samples') ? samples : [];
  const total = visibleNotes.length + visibleSchedules.length + visibleSamples.length;
  const shown = [
    ...visibleSchedules.map(schedule => ({ ...schedule, _kind: 'schedule' })),
    ...visibleNotes.map(note => ({ ...note, _kind: 'note' })),
    ...visibleSamples.map(sample => ({ ...sample, _kind: 'sample' })),
  ].slice(0, MAX_VISIBLE_ITEMS);

  return {
    shown,
    overflow: Math.max(0, total - MAX_VISIBLE_ITEMS),
    total,
  };
}

export function buildCalendarCellModel({
  cell,
  workLogsByDate,
  samplesByDate,
  viewMode,
  selectedDay,
  today,
  isPast,
  isToday,
}) {
  if (!cell) return null;
  const cellLogs = workLogsByDate?.get(cell.key) || [];
  const cellSamples = samplesByDate?.get(cell.key) || [];
  const { shown, overflow, total } = buildVisibleCalendarItems({
    notes: cell.notes,
    schedules: cell.schedules,
    samples: cellSamples,
    viewMode,
  });

  return {
    ...cell,
    cellLogs,
    cellSamples,
    shown,
    overflow,
    total,
    isSelected: selectedDay === cell.key,
    hasToday: isToday(cell.key, today),
    past: isPast(cell.key, today),
  };
}
