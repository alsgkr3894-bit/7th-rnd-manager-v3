'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { STATUSES, STATUS_COLORS } from '@/lib/note';
import { formatFullDate, parseTagList } from '@/lib/note/utils';
import { clampNoteRating, formatTestRound, NOTE_EVALUATION_FIELDS } from '@/lib/note/evaluation';
import { noop } from '@/lib/ui/prop-guards';
import { PhotoCarousel } from '@/components/note/PhotoCarousel';
import { highlightText } from './_NoteCard';
import { collectLatestRoundNotePhotos, noteRoundNumber } from './noteIdeaGroups';
import { NotePhotoLightbox } from './_NotePhotoLightbox';

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function roundLabel(note, index) {
  return formatTestRound(note.testRound) || `${noteRoundNumber(note) || index + 1}차`;
}

function ratingSummary(note) {
  const ratings = NOTE_EVALUATION_FIELDS.map(item => clampNoteRating(note[item.key])).filter(
    value => value > 0
  );
  if (!ratings.length) return '';
  const avg = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
  return `평균 ${avg.toFixed(1)}/5`;
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: '8px 9px',
        borderRadius: 8,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: 10,
          color: 'var(--text-4)',
          fontWeight: 800,
          marginBottom: 2,
        }}
      >
        {label}
      </span>
      <strong
        style={{
          display: 'block',
          minWidth: 0,
          fontSize: 13,
          color: 'var(--text-1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function latestSummary(note, hlRe) {
  const value =
    asText(note.reportSummary) ||
    asText(note.testContent) ||
    asText(note.tasteEval) ||
    asText(note.nextAction);
  return value ? highlightText(value, hlRe) : '최근 테스트 기록이 정리되어 있습니다';
}

function previewRows(note = {}) {
  return [
    ['테스트 내용', asText(note.testContent)],
    ['맛 평가', asText(note.tasteEval)],
    ['보고용 요약', asText(note.reportSummary)],
    ['다음 액션', asText(note.nextAction)],
  ]
    .filter(([, value]) => value)
    .slice(0, 4);
}

export function NoteIdeaGroupCard({
  group,
  draggable = false,
  isDragging = false,
  isDropTarget = false,
  canEdit = false,
  batchMode,
  selected,
  pinnedIds,
  hlRe,
  onContextMenu,
  onToggleSelect,
  onOpen,
  onEdit,
  onDelete,
  onCopy,
  onStatusChange,
  onNewVersion,
  onPin,
  onTagClick,
  onUnmergeGroup,
  onDragStartGroup,
  onDragOverGroup,
  onDragLeaveGroup,
  onDropGroup,
  onDragEndGroup,
}) {
  const notes = group.notes || [];
  const latest = group.latestNote || notes[notes.length - 1] || {};
  const latestStatus = latest.status || '테스트';
  const representativeLabel = latestStatus === '출시' ? '완성본' : '최신 차수';
  const representativeInlineLabel = latestStatus === '출시' ? '완성본' : '최신';
  const statusColor = STATUS_COLORS[latestStatus] || STATUS_COLORS['테스트'];
  const photos = collectLatestRoundNotePhotos(notes, 99);
  const tags = parseTagList(latest.tags);
  const open = typeof onOpen === 'function' ? onOpen : noop;
  const contextMenu = typeof onContextMenu === 'function' ? onContextMenu : noop;
  const toggleSelect = typeof onToggleSelect === 'function' ? onToggleSelect : noop;
  const edit = typeof onEdit === 'function' ? onEdit : noop;
  const remove = typeof onDelete === 'function' ? onDelete : noop;
  const copy = typeof onCopy === 'function' ? onCopy : noop;
  const statusChange = typeof onStatusChange === 'function' ? onStatusChange : noop;
  const newVersion = typeof onNewVersion === 'function' ? onNewVersion : noop;
  const pin = typeof onPin === 'function' ? onPin : noop;
  const tagClick = typeof onTagClick === 'function' ? onTagClick : noop;
  const unmergeGroup = typeof onUnmergeGroup === 'function' ? onUnmergeGroup : noop;
  const isPinned = pinnedIds.has(latest.id);
  const [expanded, setExpanded] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const latestRoundLabel = roundLabel(latest, Math.max(notes.length - 1, 0));
  const latestPreviewRows = previewRows(latest);
  const canUnmergeGroup = canEdit && !batchMode && notes.some(note => note?.parentId != null);

  function toggleExpanded(event) {
    if (batchMode || event.defaultPrevented) return;
    setExpanded(value => !value);
  }

  function openRound(note, event) {
    event?.stopPropagation();
    if (!note?.id) return;
    if (canEdit && batchMode) toggleSelect(note.id);
    else open(note);
  }

  function handleRoundKeyDown(note, event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openRound(note, event);
  }

  return (
    <div
      className="card card-lift"
      draggable={draggable}
      style={{
        padding: 0,
        overflow: 'hidden',
        border: `1px solid ${isDropTarget ? 'var(--accent)' : `${statusColor.color}33`}`,
        borderTop: `4px solid ${statusColor.color}`,
        minHeight: expanded ? 420 : 280,
        display: 'flex',
        flexDirection: 'column',
        cursor: draggable ? 'grab' : batchMode ? undefined : 'pointer',
        opacity: isDragging ? 0.58 : 1,
        outline: isDropTarget ? '2px solid var(--accent)' : 'none',
        outlineOffset: isDropTarget ? 3 : 0,
        boxShadow: isDropTarget
          ? '0 18px 46px color-mix(in srgb, var(--accent) 22%, transparent)'
          : undefined,
        transition: 'opacity 140ms ease, outline-color 140ms ease, box-shadow 140ms ease',
      }}
      onClick={toggleExpanded}
      onContextMenu={event => contextMenu(latest, event)}
      onDragStart={onDragStartGroup}
      onDragOver={onDragOverGroup}
      onDragLeave={onDragLeaveGroup}
      onDrop={onDropGroup}
      onDragEnd={onDragEndGroup}
    >
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid var(--divider)',
          background: 'var(--surface-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <select
            value={latestStatus}
            disabled={!canEdit || latest.id == null}
            aria-label={`${group.title} 상태 변경`}
            onMouseDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
            onChange={event => statusChange(latest.id, event.target.value, event)}
            style={{
              fontSize: 11,
              fontWeight: 900,
              padding: '3px 24px 3px 9px',
              borderRadius: 999,
              background: statusColor.bg,
              color: statusColor.color,
              border: `1px solid ${statusColor.color}40`,
              cursor: canEdit && latest.id != null ? 'pointer' : 'default',
              fontFamily: 'inherit',
              outline: 'none',
              maxWidth: 108,
            }}
          >
            {STATUSES.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--text-2)',
              padding: '3px 8px',
              borderRadius: 999,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            {group.category || '미분류'}
          </span>
          {group.menuCode && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--text-3)',
                padding: '3px 8px',
                borderRadius: 999,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              {group.menuCode}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
            {group.periodLabel || formatFullDate(latest.testDate)}
          </span>
          <button
            className="btn sm"
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? '차수 접기' : '차수 펼치기'}
            onClick={event => {
              event.stopPropagation();
              setExpanded(value => !value);
            }}
            style={{ marginLeft: 'auto', padding: '4px 6px' }}
          >
            {expanded ? (
              <Icon.chevDown style={{ width: 14, height: 14 }} />
            ) : (
              <Icon.chevRight style={{ width: 14, height: 14 }} />
            )}
          </button>
          <button
            className={'pin-btn' + (isPinned ? ' pinned' : '')}
            onClick={event => pin(latest.id, event)}
            title={isPinned ? '핀 해제' : '핀 고정'}
          >
            {isPinned ? '★' : '☆'}
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: photos.length ? 'minmax(0,1fr) 132px' : '1fr',
            gap: 14,
            alignItems: 'start',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.3,
                color: 'var(--text-1)',
                marginBottom: 9,
              }}
            >
              {highlightText(group.title, hlRe)}
            </div>
            <div
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: 48,
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text-2)',
              }}
            >
              {latestSummary(latest, hlRe)}
            </div>
          </div>

          {photos.length > 0 && (
            <div onMouseDown={event => event.stopPropagation()} onDragStart={event => event.preventDefault()}>
              <PhotoCarousel
                photos={photos}
                title={group.title}
                height={132}
                onPhotoClick={photo => setPreviewPhoto(photo)}
              />
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
            gap: 6,
            marginTop: 13,
          }}
        >
          <MiniStat label="차수" value={notes.length} />
          <MiniStat
            label="사진"
            value={(notes || []).reduce(
              (sum, note) =>
                sum + (Array.isArray(note?.photos) ? note.photos.filter(photo => photo?.data).length : 0),
              0
            )}
          />
          <MiniStat label="대표" value={roundLabel(latest, Math.max(notes.length - 1, 0))} />
        </div>
      </div>

      {expanded && (
        <div
          style={{ padding: '12px 14px 14px', display: 'grid', gap: 10, flex: 1 }}
          onClick={event => event.stopPropagation()}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={event => openRound(latest, event)}
            onKeyDown={event => handleRoundKeyDown(latest, event)}
            style={{
              display: 'grid',
              gap: 8,
              padding: '12px 13px',
              borderRadius: 8,
              background: statusColor.bg,
              border: `1px solid ${statusColor.color}40`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 12, color: statusColor.color }}>{latestRoundLabel}</strong>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 800 }}>
                {representativeLabel}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)' }}>
                {formatFullDate(latest.testDate)}
              </span>
            </div>
            {latestPreviewRows.length > 0 ? (
              <div style={{ display: 'grid', gap: 6 }}>
                {latestPreviewRows.map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '72px minmax(0,1fr)',
                      gap: 8,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: 'var(--text-2)',
                    }}
                  >
                    <span style={{ color: 'var(--text-3)', fontWeight: 800 }}>{label}</span>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {highlightText(value, hlRe)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>상세 기록 없음</span>
            )}
          </div>

          {notes.map((note, index) => {
            const checked = selected.has(note.id);
            const isLatest = note.id === latest.id;
            const roundPhotos = collectLatestRoundNotePhotos([note], 99);
            return (
              <div
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={event => openRound(note, event)}
                onContextMenu={event => contextMenu(note, event)}
                onKeyDown={event => handleRoundKeyDown(note, event)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: batchMode ? '24px 64px minmax(0,1fr)' : '64px minmax(0,1fr)',
                  gap: 9,
                  alignItems: 'center',
                  minHeight: 50,
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: `1px solid ${checked || isLatest ? statusColor.color : 'var(--border)'}`,
                  background: checked
                    ? 'var(--accent-soft)'
                    : isLatest
                      ? statusColor.bg
                      : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                {batchMode && (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
                      fontSize: 12,
                      fontWeight: 900,
                      color: 'var(--accent)',
                    }}
                  >
                    {checked ? '✓' : ''}
                  </span>
                )}
                <span
                  style={{
                    justifySelf: 'start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 900,
                    color: isLatest ? statusColor.color : 'var(--accent)',
                  }}
                >
                  {roundLabel(note, index)}
                  {isLatest && (
                    <span style={{ fontSize: 10, color: 'var(--text-4)' }}>
                      {representativeInlineLabel}
                    </span>
                  )}
                </span>
                <span style={{ minWidth: 0, color: 'var(--text-2)', fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ color: 'var(--text-4)' }}>{formatFullDate(note.testDate)}</span>
                    {ratingSummary(note) && (
                      <span style={{ color: 'var(--accent)', fontWeight: 800 }}>
                        {ratingSummary(note)}
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {highlightText(asText(note.nextAction) || asText(note.testContent), hlRe) ||
                      '기록 보기'}
                  </span>
                </span>
                {roundPhotos.length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <PhotoCarousel
                      photos={roundPhotos}
                      title={`${group.title} ${roundLabel(note, index)}`}
                      height={92}
                      onPhotoClick={photo => setPreviewPhoto(photo)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          padding: '0 14px 14px',
        }}
      >
        {tags.slice(0, 4).map(tag => (
          <span
            key={tag}
            className="tag-chip-clickable"
            style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 12,
              background: 'var(--surface-2)',
              color: 'var(--text-3)',
            }}
            onClick={event => {
              event.stopPropagation();
              tagClick(tag);
            }}
          >
            #{highlightText(tag, hlRe)}
          </span>
        ))}

        {!batchMode && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {canUnmergeGroup && (
              <button
                className="btn sm xs"
                type="button"
                onMouseDown={event => event.stopPropagation()}
                onClick={event => {
                  event.stopPropagation();
                  unmergeGroup(notes.map(note => note.id).filter(id => id != null));
                }}
              >
                묶음 분리
              </button>
            )}
            <button
              className="btn sm xs"
              onClick={event => newVersion(latest, event)}
              disabled={!canEdit}
            >
              + 다음 차수
            </button>
            <button
              className="btn sm xs"
              onClick={event => copy(latest, event)}
              disabled={!canEdit}
            >
              복사
            </button>
            <button className="btn sm" onClick={event => edit(latest, event)} disabled={!canEdit}>
              <Icon.edit style={{ width: 12, height: 12 }} />
            </button>
            <button
              className="btn sm"
              onClick={event => remove(latest, event)}
              style={{ color: 'var(--negative)' }}
              disabled={!canEdit}
            >
              <Icon.trash style={{ width: 12, height: 12 }} />
            </button>
          </div>
        )}
      </div>
      <NotePhotoLightbox
        photo={previewPhoto}
        title={group.title}
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  );
}
