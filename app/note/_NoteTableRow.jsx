'use client';
import React from 'react';
import { Icon } from '@/components/icons';
import { STATUSES, STATUS_COLORS } from '@/lib/note';
import { noteDisplayTitle } from '@/lib/note/display';
import { formatFullDate } from '@/lib/note/utils';

export const NoteTableRow = React.memo(function NoteTableRow({
  note,
  focused,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit = false,
}) {
  const sc = STATUS_COLORS[note.status] || STATUS_COLORS['테스트'];
  const title = noteDisplayTitle(note);

  return (
    <tr
      style={{
        cursor: 'pointer',
        background: focused ? 'var(--accent-soft, rgba(99,102,241,.08))' : undefined,
      }}
      onClick={() => onOpen(note)}
    >
      <td style={{ fontWeight: 600 }}>
        {note.parentId && (
          <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>🔗 체인</span>
        )}
        {title}
      </td>
      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{note.category}</td>
      <td>
        <select
          value={note.status}
          onChange={e => onStatusChange(note.id, e.target.value, e)}
          onClick={e => e.stopPropagation()}
          disabled={!canEdit}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 12,
            background: sc.bg,
            color: sc.color,
            border: `1px solid ${sc.color}40`,
            cursor: canEdit ? 'pointer' : 'default',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatFullDate(note.testDate)}</td>
      <td onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn sm"
            onClick={() => onEdit(note)}
            disabled={!canEdit}
            aria-label={`${title} 수정`}
          >
            <Icon.edit style={{ width: 12, height: 12 }} />
          </button>
          <button
            className="btn sm"
            style={{ color: 'var(--negative)' }}
            onClick={e => onDelete(note, e)}
            disabled={!canEdit}
            aria-label={`${title} 삭제`}
          >
            <Icon.trash style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </td>
    </tr>
  );
});
