'use client';
import { Fragment, useState } from 'react';
import { Icon } from '@/components/icons';
import { STATUSES, STATUS_COLORS } from '@/lib/note';
import { noteDisplayTitle } from '@/lib/note/display';
import { formatTestRound } from '@/lib/note/evaluation';
import { isUnifiedSampleRecord } from '@/lib/note/unified-records';
import { formatFullDate } from '@/lib/note/utils';
import { NoteTableRow } from './_NoteTableRow';
import { buildNoteIdeaGroups, noteRoundNumber } from './noteIdeaGroups';

function roundLabel(note, index) {
  return formatTestRound(note?.testRound) || `${noteRoundNumber(note) || index + 1}차`;
}

export function NoteTableView({
  visible,
  filtered,
  sortBy,
  pinnedIds,
  canEdit = false,
  batchMode,
  selected,
  focusedRow,
  onFocusRow,
  onOpen,
  onEdit,
  onToggleSelect,
  onDelete,
  onStatusChange,
  onUnmergeGroup,
  onLoadMore,
}) {
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const visibleLimit = Array.isArray(visible) ? visible.length : 0;
  const allGroups = buildNoteIdeaGroups(filtered, filtered, { sortBy, pinnedIds });
  const groups = allGroups.slice(0, visibleLimit);

  function toggleGroup(groupKey) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  }

  function openNote(note) {
    if (!note?.id) return;
    onFocusRow(note.id);
    onOpen(note);
  }

  function groupNoteIds(group = {}) {
    return (group.notes || []).map(note => note.id).filter(id => id != null);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onFocusRow(rowId => {
        const current = rowId == null ? -1 : filtered.findIndex(note => note.id === rowId);
        return filtered[Math.min(current + 1, filtered.length - 1)]?.id ?? rowId;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onFocusRow(rowId => {
        const current =
          rowId == null ? filtered.length : filtered.findIndex(note => note.id === rowId);
        return filtered[Math.max(current - 1, 0)]?.id ?? rowId;
      });
    } else if (e.key === 'Enter' && focusedRow != null) {
      const note = filtered.find(item => item.id === focusedRow);
      if (note) onOpen(note);
    } else if (e.key === 'Escape') {
      onFocusRow(null);
    }
  }

  return (
    <div className="card table-card" style={{ marginTop: 16 }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table stagger-rows" tabIndex={0} onKeyDown={handleKeyDown}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)' }}>
            <tr>
              {batchMode && <th scope="col" style={{ width: 44 }} aria-label="선택" />}
              <th scope="col">메뉴</th>
              <th scope="col" style={{ width: 80 }}>
                카테고리
              </th>
              <th scope="col" style={{ width: 90 }}>
                메뉴 상태
              </th>
              <th scope="col" style={{ width: 90 }}>
                최신 날짜
              </th>
              <th scope="col" style={{ width: 132 }} aria-label="액션" />
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const latest = group.latestNote || group.notes[group.notes.length - 1] || {};
              const title = noteDisplayTitle(latest, group.title);
              const latestStatus = latest.status || '테스트';
              const representativeLabel = latestStatus === '출시' ? '완성본' : '최신';
              const colors = STATUS_COLORS[latestStatus] || STATUS_COLORS['테스트'];
              const expanded = expandedGroups.has(group.key);
              const hasSampleRecord = group.notes.some(note => isUnifiedSampleRecord(note));
              const canChangeStatus = canEdit && latest.id != null && !hasSampleRecord;
              const canUnmergeGroup =
                canEdit &&
                !batchMode &&
                !hasSampleRecord &&
                group.notes.some(note => note?.parentId != null);

              return (
                <Fragment key={group.key}>
                  <tr
                    style={{
                      background: expanded ? 'var(--surface-2)' : undefined,
                      borderTop: `2px solid ${colors.color}`,
                    }}
                  >
                    {batchMode && <td aria-label="그룹" />}
                    <td style={{ fontWeight: 800 }}>
                      <button
                        className="btn sm"
                        type="button"
                        aria-expanded={expanded}
                        onClick={event => {
                          event.stopPropagation();
                          toggleGroup(group.key);
                        }}
                        style={{ marginRight: 8, padding: '4px 6px' }}
                      >
                        {expanded ? (
                          <Icon.chevDown style={{ width: 14, height: 14 }} />
                        ) : (
                          <Icon.chevRight style={{ width: 14, height: 14 }} />
                        )}
                      </button>
                      {title}
                      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-4)' }}>
                        {group.menuCode ? `${group.menuCode} · ` : ''}
                        {group.notes.length}개 차수 · {representativeLabel}{' '}
                        {roundLabel(latest, group.notes.length - 1)}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{group.category}</td>
                    <td onClick={event => event.stopPropagation()}>
                      <select
                        value={latestStatus}
                        onChange={event => onStatusChange(latest.id, event.target.value, event)}
                        disabled={!canChangeStatus}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 12,
                          background: colors.bg,
                          color: colors.color,
                          border: `1px solid ${colors.color}40`,
                          cursor: canChangeStatus ? 'pointer' : 'default',
                          fontFamily: 'inherit',
                          outline: 'none',
                        }}
                      >
                        {STATUSES.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {formatFullDate(latest.testDate)}
                    </td>
                    <td onClick={event => event.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {canUnmergeGroup && (
                          <button
                            className="btn sm"
                            type="button"
                            onClick={() => onUnmergeGroup?.(groupNoteIds(group))}
                          >
                            분리
                          </button>
                        )}
                        <button
                          className="btn sm"
                          type="button"
                          onClick={() => openNote(latest)}
                          disabled={!latest.id}
                        >
                          보기
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded &&
                    group.notes.map((note, index) => (
                      <NoteTableRow
                        key={note.id}
                        note={note}
                        roundLabel={roundLabel(note, index)}
                        focused={focusedRow === note.id}
                        onOpen={openNote}
                        onEdit={onEdit}
                        batchMode={batchMode}
                        selected={selected}
                        onToggleSelect={onToggleSelect}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                        canEdit={canEdit}
                      />
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {groups.length < allGroups.length && (
        <button className="load-more-btn" onClick={onLoadMore}>
          더보기 ({allGroups.length - groups.length}개 남음)
        </button>
      )}
    </div>
  );
}
