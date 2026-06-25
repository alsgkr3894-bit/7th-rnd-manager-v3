import { Icon } from '@/components/icons';
import { STATUS_COLORS } from '@/lib/note';
import { formatFullDate, parseTagList } from '@/lib/note/utils';
import { clampNoteRating, formatTestRound, NOTE_EVALUATION_FIELDS } from '@/lib/note/evaluation';
import { noop } from '@/lib/ui/prop-guards';
import { highlightText } from './_NoteCard';
import { collectRecentNotePhotos, noteRoundNumber } from './noteIdeaGroups';

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

function statusCounts(notes) {
  const map = new Map();
  for (const note of notes) {
    const status = note.status || '테스트';
    map.set(status, (map.get(status) || 0) + 1);
  }
  return [...map.entries()];
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

export function NoteIdeaGroupCard({
  group,
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
  onNewVersion,
  onPin,
  onTagClick,
}) {
  const notes = group.notes || [];
  const latest = group.latestNote || notes[notes.length - 1] || {};
  const latestStatus = latest.status || '테스트';
  const statusColor = STATUS_COLORS[latestStatus] || STATUS_COLORS['테스트'];
  const photos = collectRecentNotePhotos(notes, 3);
  const tags = parseTagList(latest.tags);
  const statusItems = statusCounts(notes);
  const open = typeof onOpen === 'function' ? onOpen : noop;
  const contextMenu = typeof onContextMenu === 'function' ? onContextMenu : noop;
  const toggleSelect = typeof onToggleSelect === 'function' ? onToggleSelect : noop;
  const edit = typeof onEdit === 'function' ? onEdit : noop;
  const remove = typeof onDelete === 'function' ? onDelete : noop;
  const copy = typeof onCopy === 'function' ? onCopy : noop;
  const newVersion = typeof onNewVersion === 'function' ? onNewVersion : noop;
  const pin = typeof onPin === 'function' ? onPin : noop;
  const tagClick = typeof onTagClick === 'function' ? onTagClick : noop;
  const isPinned = pinnedIds.has(latest.id);

  return (
    <div
      className="card card-lift"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: `1px solid ${statusColor.color}33`,
        borderTop: `4px solid ${statusColor.color}`,
        minHeight: 420,
        display: 'flex',
        flexDirection: 'column',
      }}
      onContextMenu={event => contextMenu(latest, event)}
    >
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid var(--divider)',
          background: 'var(--surface-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              padding: '3px 9px',
              borderRadius: 999,
              background: statusColor.bg,
              color: statusColor.color,
            }}
          >
            {latestStatus}
          </span>
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
          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
            {formatFullDate(latest.testDate)}
          </span>
          <button
            className={'pin-btn' + (isPinned ? ' pinned' : '')}
            onClick={event => pin(latest.id, event)}
            title={isPinned ? '핀 해제' : '핀 고정'}
            style={{ marginLeft: 'auto' }}
          >
            {isPinned ? '★' : '☆'}
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: photos.length ? 'minmax(0,1fr) 96px' : '1fr',
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
            <div
              style={{
                display: 'grid',
                gridTemplateRows: photos.length > 1 ? '1fr 1fr' : '1fr',
                gridTemplateColumns: photos.length > 2 ? '1fr 1fr' : '1fr',
                gap: 4,
                height: 96,
              }}
            >
              {photos.map((photo, index) => (
                <img
                  key={`${photo.data?.slice(0, 24) || index}-${index}`}
                  src={photo.data}
                  alt={photo.caption || photo.name || group.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 0,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    gridRow: photos.length === 3 && index === 0 ? '1 / 3' : undefined,
                  }}
                />
              ))}
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
          <MiniStat label="사진" value={photos.length} />
          <MiniStat label="최근" value={roundLabel(latest, Math.max(notes.length - 1, 0))} />
        </div>

        {statusItems.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
            {statusItems.map(([status, count]) => {
              const colors = STATUS_COLORS[status] || STATUS_COLORS['테스트'];
              return (
                <span
                  key={status}
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 999,
                    color: colors.color,
                    background: colors.bg,
                  }}
                >
                  {status} {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px 14px', display: 'grid', gap: 8, flex: 1 }}>
        {notes.map((note, index) => {
          const status = note.status || '테스트';
          const colors = STATUS_COLORS[status] || STATUS_COLORS['테스트'];
          const checked = selected.has(note.id);
          return (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              onClick={() => (canEdit && batchMode ? toggleSelect(note.id) : open(note))}
              onContextMenu={event => contextMenu(note, event)}
              onKeyDown={event => {
                if (event.key === 'Enter') open(note);
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: batchMode ? '24px 58px minmax(0,1fr)' : '58px minmax(0,1fr)',
                gap: 9,
                alignItems: 'center',
                minHeight: 48,
                padding: '9px 10px',
                borderRadius: 8,
                border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                background: checked ? 'var(--accent-soft)' : 'var(--surface)',
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
                  fontSize: 12,
                  fontWeight: 900,
                  color: 'var(--accent)',
                }}
              >
                {roundLabel(note, index)}
              </span>
              <span style={{ minWidth: 0, color: 'var(--text-2)', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <strong style={{ color: colors.color }}>{status}</strong>
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
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
