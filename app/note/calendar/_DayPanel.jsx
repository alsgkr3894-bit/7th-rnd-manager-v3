'use client';
import { useState } from 'react';
import { asDisplayText, asObjectArray, noop } from '@/lib/ui/prop-guards';
import { DayPanelHeader } from './_DayPanelHeader';
import { DayScheduleSection } from './_DayScheduleSection';
import { DayNoteSection } from './_DayNoteSection';
import { DaySampleSection } from './_DaySampleSection';
import { DayWorkLogSection } from './_DayWorkLogSection';

export function DayPanel({
  dateKey,
  today,
  notes,
  schedules,
  workLogs,
  samples = [],
  viewMode,
  router,
  onClose,
  onAddSchedule,
  onEditSchedule,
  onAddNote,
  onOpenNote,
  onOpenSample,
}) {
  const safeDateKey = asDisplayText(dateKey);
  const safeToday = asDisplayText(today);
  const safeNotes = asObjectArray(notes);
  const safeSchedules = asObjectArray(schedules);
  const safeWorkLogs = asObjectArray(workLogs);
  const safeSamples = asObjectArray(samples);
  const safeViewMode = asDisplayText(viewMode, 'all');
  const close = typeof onClose === 'function' ? onClose : noop;
  const addSchedule = typeof onAddSchedule === 'function' ? onAddSchedule : noop;
  const editSchedule = typeof onEditSchedule === 'function' ? onEditSchedule : noop;
  const addNote = typeof onAddNote === 'function' ? onAddNote : noop;
  const push = typeof router?.push === 'function' ? router.push.bind(router) : noop;
  const [logsOpen, setLogsOpen] = useState(false);
  const openNote = typeof onOpenNote === 'function' ? onOpenNote : id => push(`/note/${id}`);
  const openSample =
    typeof onOpenSample === 'function' ? onOpenSample : id => push(`/note/sample/${id}`);

  return (
    <>
      <DayPanelHeader
        dateKey={safeDateKey}
        today={safeToday}
        notesCount={safeNotes.length}
        schedulesCount={safeSchedules.length}
        onClose={close}
      />

      {safeViewMode !== 'notes' && (
        <DayScheduleSection schedules={safeSchedules} onAdd={addSchedule} onEdit={editSchedule} />
      )}

      {safeViewMode === 'all' && safeSchedules.length > 0 && safeNotes.length > 0 && (
        <div style={{ height: 1, background: 'var(--divider)', margin: '8px 0 12px' }} />
      )}

      {safeViewMode !== 'schedules' && (
        <DayNoteSection notes={safeNotes} onAdd={addNote} onOpen={openNote} />
      )}

      {(safeViewMode === 'all' || safeViewMode === 'samples') && safeSamples.length > 0 && (
        <DaySampleSection samples={safeSamples} onOpen={openSample} />
      )}

      <DayWorkLogSection
        logs={safeWorkLogs}
        open={logsOpen}
        onToggle={() => setLogsOpen(v => !v)}
      />
    </>
  );
}
