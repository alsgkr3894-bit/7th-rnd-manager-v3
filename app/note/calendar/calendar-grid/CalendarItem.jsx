import { sampleNamesText } from '@/lib/sample';
import { STATUS_BORDER, STATUS_COLORS } from '@/lib/note/constants';
import { noteDisplayTitle } from '@/lib/note/display';
import { SCHEDULE_COLORS } from '@/lib/note/schedules';

export function CalendarItem({
  item,
  past,
  canEdit = false,
  onEditSchedule,
  onOpenNote,
  onOpenSample,
}) {
  if (item._kind === 'schedule') {
    return <ScheduleCalendarItem item={item} canEdit={canEdit} onEditSchedule={onEditSchedule} />;
  }

  if (item._kind === 'sample') {
    return <SampleCalendarItem item={item} onOpenSample={onOpenSample} />;
  }

  return <NoteCalendarItem item={item} past={past} onOpenNote={onOpenNote} />;
}

function ScheduleCalendarItem({ item, canEdit = false, onEditSchedule }) {
  const color = SCHEDULE_COLORS[item.type] || SCHEDULE_COLORS['기타'];

  return (
    <button
      disabled={!canEdit}
      onClick={event => {
        event.stopPropagation();
        if (!canEdit) return;
        onEditSchedule(item);
      }}
      title={`[${item.type}] ${item.title}${item.time ? ' ' + item.time : ''}${item._isRecurring ? ' (반복)' : ''}`}
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
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
        cursor: canEdit ? 'pointer' : 'not-allowed',
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

function SampleCalendarItem({ item, onOpenSample }) {
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
        padding: '2px 6px',
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

function NoteCalendarItem({ item, past, onOpenNote }) {
  const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS['테스트'];
  const statusBorder = STATUS_BORDER[item.status] || 'var(--border)';
  const label = noteDisplayTitle(item);

  return (
    <button
      onClick={event => {
        event.stopPropagation();
        onOpenNote(item.id);
      }}
      title={`[${item.status}] ${label}`}
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
      {label}
    </button>
  );
}
