'use client';
import React from 'react';
import { Icon } from '@/components/icons';
import { STATUSES, STATUS_COLORS } from '@/lib/note';
import { noteDisplayTitle } from '@/lib/note/display';
import { isUnifiedSampleRecord } from '@/lib/note/unified-records';
import { formatFullDate } from '@/lib/note/utils';

export const NoteTableRow = React.memo(function NoteTableRow({
  note,
  roundLabel,
  focused,
  batchMode,
  selected,
  onOpen,
  onEdit,
  onToggleSelect,
  onDelete,
  onStatusChange,
  canEdit = false,
}) {
  const sc = STATUS_COLORS[note.status] || STATUS_COLORS['테스트'];
  const title = noteDisplayTitle(note);
  const menuCode = typeof note.menuCode === 'string' ? note.menuCode.trim() : '';
  const checked = selected?.has(note.id) || false;
  const canChangeStatus = canEdit && !isUnifiedSampleRecord(note);
  const handleOpen = () => {
    if (canEdit && batchMode) onToggleSelect(note.id);
    else onOpen(note);
  };

  return (
    <tr
      style={{
        cursor: 'pointer',
        background: checked
          ? 'var(--accent-soft)'
          : focused
            ? 'var(--accent-soft, rgba(99,102,241,.08))'
            : undefined,
      }}
      onClick={handleOpen}
    >
      {batchMode && (
        <td onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleSelect(note.id)}
            disabled={!canEdit}
            aria-label={`${title} 선택`}
          />
        </td>
      )}
      <td style={{ fontWeight: 600 }}>
        {roundLabel && (
          <span
            style={{
              display: 'inline-flex',
              minWidth: 42,
              marginRight: 8,
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {roundLabel}
          </span>
        )}
        {note.parentId && (
          <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>🔗 체인</span>
        )}
        {title}
        {menuCode && (
          <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-4)', fontWeight: 500 }}>
            {menuCode}
          </div>
        )}
      </td>
      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{note.category}</td>
      <td>
        <select
          value={note.status}
          onChange={e => onStatusChange(note.id, e.target.value, e)}
          onClick={e => e.stopPropagation()}
          disabled={!canChangeStatus}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 12,
            background: sc.bg,
            color: sc.color,
            border: `1px solid ${sc.color}40`,
            cursor: canChangeStatus ? 'pointer' : 'default',
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
