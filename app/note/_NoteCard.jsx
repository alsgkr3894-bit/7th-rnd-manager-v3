'use client';
import { Icon } from '@/components/icons';
import { STATUSES, STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { noteDisplayTitle } from '@/lib/note/display';
import { clampNoteRating, formatTestRound, NOTE_EVALUATION_FIELDS } from '@/lib/note/evaluation';
import { parseTagList, formatFullDate } from '@/lib/note/utils';
import { noop } from '@/lib/ui/prop-guards';
import { collectRecentNotePhotos } from './noteIdeaGroups';

/** 검색어 하이라이트 적용 (React 요소 배열 반환) */
export function highlightText(text, regex) {
  if (!regex || !text) return text;
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="search-hl">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function firstPhoto(photos) {
  return collectRecentNotePhotos([{ photos }], 1)[0] || null;
}

export function NoteCard({
  note = {},
  onEdit,
  onDelete,
  onCopy,
  onStatusChange,
  onNewVersion,
  onClick,
  hlRe,
  statusPop,
  batchMode,
  selected,
  pinned,
  onPin,
  onTagClick,
  canEdit = false,
}) {
  const edit = typeof onEdit === 'function' ? onEdit : noop;
  const remove = typeof onDelete === 'function' ? onDelete : noop;
  const copy = typeof onCopy === 'function' ? onCopy : noop;
  const statusChange = typeof onStatusChange === 'function' ? onStatusChange : noop;
  const newVersion = typeof onNewVersion === 'function' ? onNewVersion : noop;
  const cardClick = typeof onClick === 'function' ? onClick : noop;
  const pin = typeof onPin === 'function' ? onPin : noop;
  const tagClick = typeof onTagClick === 'function' ? onTagClick : noop;
  const status = note.status || '테스트';
  const category = asText(note.category) || '—';
  const noteType = asText(note.noteType) || '—';
  const testDate = typeof note.testDate === 'string' ? note.testDate : '';
  const title = noteDisplayTitle(note);
  const testContent = asText(note.testContent);
  const photo = firstPhoto(note.photos);
  const tags = parseTagList(note.tags);
  const ratingItems = NOTE_EVALUATION_FIELDS.map(item => ({
    ...item,
    rating: clampNoteRating(note[item.key]),
  })).filter(item => item.rating > 0);
  const snippets = [
    ['시식', asText(note.tasteEval)],
    ['다음', asText(note.nextAction)],
    ['요약', asText(note.reportSummary)],
  ]
    .filter(([, value]) => value)
    .slice(0, 2);
  const sc = STATUS_COLORS[status] || STATUS_COLORS['테스트'];
  const sb = STATUS_BORDER[status] || 'var(--border)';
  return (
    <div
      className="card card-lift"
      style={{
        cursor: 'pointer',
        borderTop: `3px solid ${sb}`,
        padding: 0,
        overflow: 'hidden',
        outline: selected ? `2px solid var(--accent)` : 'none',
        outlineOffset: 0,
      }}
      onClick={cardClick}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--divider)',
          background: 'var(--surface-2)',
        }}
      >
        <select
          value={status}
          onChange={e => statusChange(e.target.value, e)}
          onClick={e => e.stopPropagation()}
          disabled={!canEdit}
          className={statusPop ? 'status-pop-anim' : ''}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 20,
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
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {category} · {noteType}
        </span>
        {note.testRound && (
          <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>
            {formatTestRound(note.testRound)}
          </span>
        )}
        {note.parentId && (
          <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>버전 체인</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)' }}>
          {formatFullDate(testDate)}
        </span>
        <button
          className={'pin-btn' + (pinned ? ' pinned' : '')}
          onClick={pin}
          title={pinned ? '핀 해제' : '핀 고정'}
        >
          {pinned ? '★' : '☆'}
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: photo ? '96px minmax(0,1fr)' : '1fr',
          gap: 12,
          padding: '14px 16px 12px',
        }}
      >
        {photo && (
          <img
            src={photo.data}
            alt={photo.caption || photo.name || title}
            style={{
              width: 96,
              height: 96,
              borderRadius: 8,
              objectFit: 'contain',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              lineHeight: 1.35,
              marginBottom: 8,
              color: 'var(--text-1)',
            }}
          >
            {highlightText(title, hlRe)}
          </div>
          {testContent && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-2)',
                lineHeight: 1.65,
                borderRadius: 8,
                background: 'var(--surface-2)',
                padding: '9px 10px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {highlightText(testContent, hlRe)}
            </div>
          )}
          {snippets.length > 0 && (
            <div style={{ display: 'grid', gap: 6, marginTop: 9 }}>
              {snippets.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '34px minmax(0,1fr)',
                    gap: 7,
                    fontSize: 12,
                    color: 'var(--text-2)',
                  }}
                >
                  <span style={{ fontWeight: 800, color: 'var(--text-3)' }}>{label}</span>
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
          )}
          {ratingItems.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
              {ratingItems.map(item => (
                <span
                  key={item.key}
                  style={{
                    fontSize: 11,
                    padding: '2px 7px',
                    borderRadius: 12,
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-text)',
                    fontWeight: 800,
                  }}
                >
                  {item.label} {item.rating}/5
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          padding: '0 16px 14px',
        }}
      >
        {tags.slice(0, 3).map(t => (
          <span
            key={t}
            className="tag-chip-clickable"
            style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 12,
              background: 'var(--surface-2)',
              color: 'var(--text-3)',
            }}
            onClick={e => {
              e.stopPropagation();
              tagClick(t);
            }}
          >
            #{highlightText(t, hlRe)}
          </span>
        ))}
        {!batchMode && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
            <button
              className="btn sm xs"
              onClick={newVersion}
              style={{ color: 'var(--text-3)' }}
              disabled={!canEdit}
            >
              + 버전
            </button>
            <button
              className="btn sm xs"
              onClick={copy}
              style={{ color: 'var(--text-3)' }}
              disabled={!canEdit}
            >
              복사
            </button>
            <button className="btn sm" onClick={edit} disabled={!canEdit}>
              <Icon.edit style={{ width: 12, height: 12 }} />
            </button>
            <button
              className="btn sm"
              onClick={remove}
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
