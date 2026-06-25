'use client';
import React from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { STATUSES, STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { noteDisplayTitle } from '@/lib/note/display';
import { formatShortDate } from '@/lib/note/utils';
import { copyText } from '@/lib/ui/clipboard';

function buildNoteCopyText(note) {
  const lines = [`[${note.status}] ${noteDisplayTitle(note)}`];
  if (note.testDate) lines.push(`테스트일: ${note.testDate}`);
  if (note.reportSummary) lines.push(`결과: ${note.reportSummary}`);
  if (note.nextAction) lines.push(`다음 액션: ${note.nextAction}`);
  return lines.join('\n');
}

async function copyNoteText(note) {
  try {
    if (!(await copyText(buildNoteCopyText(note)))) throw new Error('CLIPBOARD_UNAVAILABLE');
    showToast('보고용 텍스트를 복사했어요', 'ok');
  } catch {
    showToast('복사에 실패했어요', 'error');
  }
}

export const KanbanCard = React.memo(function KanbanCard({
  note,
  colIdx,
  maxIdx,
  onMove,
  onStatusChange,
  onEdit,
  canEdit = false,
  isDragging,
  bouncing,
  draggable = true,
  onDragStart,
  onDragEnd,
}) {
  const sc = STATUS_COLORS[note.status] || STATUS_COLORS['테스트'];
  const sb = STATUS_BORDER[note.status] || 'var(--border)';
  const title = noteDisplayTitle(note);

  function handleKeyDown(e) {
    if (!canEdit && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onMove(note, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onMove(note, 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (canEdit) onEdit(`/note/${note.id}`);
    }
  }

  return (
    <div
      className={`kanban-card${isDragging ? ' kanban-card-dragging' : ''}${bouncing ? ' kanban-card-bounce' : ''}`}
      draggable={draggable}
      tabIndex={0}
      role="article"
      aria-label={title}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onKeyDown={handleKeyDown}
      style={{
        background: 'var(--surface)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${sb}`,
        padding: '10px 12px',
        opacity: isDragging ? 0.4 : 1,
        cursor: draggable ? 'grab' : 'pointer',
        transition: 'opacity 0.15s',
        outline: 'none',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 13,
          color: 'var(--text-1)',
          marginBottom: 3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </div>
      {note.testDate && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
          {formatShortDate(note.testDate)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {/* 데스크탑: ← → 버튼 */}
        <button
          className="btn sm kanban-arrow-btn"
          style={{ padding: '2px 6px', fontSize: 11, opacity: colIdx === 0 ? 0.3 : 1 }}
          disabled={!canEdit || colIdx === 0}
          onClick={e => {
            e.stopPropagation();
            onMove(note, -1);
          }}
          title="이전 상태로"
        >
          ←
        </button>
        <button
          className="btn sm kanban-arrow-btn"
          style={{ padding: '2px 6px', fontSize: 11, opacity: colIdx === maxIdx ? 0.3 : 1 }}
          disabled={!canEdit || colIdx === maxIdx}
          onClick={e => {
            e.stopPropagation();
            onMove(note, 1);
          }}
          title="다음 상태로"
        >
          →
        </button>

        {/* 모바일: 상태 직접 선택 */}
        <select
          className="kanban-status-select"
          value={note.status}
          disabled={!canEdit}
          onChange={e => {
            if (!canEdit) return;
            e.stopPropagation();
            onStatusChange(note, e.target.value);
          }}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 10,
            background: sc.bg,
            color: sc.color,
            border: `1px solid ${sc.color}40`,
            cursor: canEdit ? 'pointer' : 'default',
            fontFamily: 'inherit',
            outline: 'none',
            maxWidth: 90,
          }}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          className="btn sm"
          style={{ marginLeft: 'auto', padding: '2px 6px' }}
          onClick={e => {
            e.stopPropagation();
            copyNoteText(note);
          }}
          title="보고용 복사"
        >
          <Icon.copy style={{ width: 11, height: 11 }} />
        </button>
        <button
          className="btn sm"
          style={{ padding: '2px 6px' }}
          onClick={e => {
            e.stopPropagation();
            if (!canEdit) return;
            onEdit(`/note/${note.id}`);
          }}
          disabled={!canEdit}
          title="수정"
        >
          <Icon.edit style={{ width: 11, height: 11 }} />
        </button>
      </div>
    </div>
  );
});
