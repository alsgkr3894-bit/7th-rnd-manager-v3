'use client';

// 연구일지 목록의 날짜 한 줄 (_JournalMonthList.jsx에서 분리)
import { toDateLabel } from './journalDates';
import { entryPhotos, entryPreviewText } from './journalSearch';
import { EntryDetail, Highlight } from './_JournalListParts';

export function EntryRow({ entry, selected, expanded, query, onSelect, onToggle, onPhotoClick }) {
  const photos = entryPhotos(entry);
  const preview = entryPreviewText(entry, query);
  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: selected ? 'var(--accent-soft)' : 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <button
          type="button"
          onClick={() => onSelect(entry.date)}
          title="이 날짜 보고서 열기(작성 탭)"
          className="journal-list-row"
        >
          <strong
            className="journal-list-row-date"
            style={{ fontSize: 13, color: selected ? 'var(--accent-text)' : 'var(--text-1)' }}
          >
            {toDateLabel(entry.date)}
          </strong>
          <span style={{ minWidth: 0, display: 'grid', gap: 4 }}>
            <span
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
                fontSize: 11,
                color: 'var(--text-3)',
              }}
            >
              {entry.journal && <span className="chip">연구일지</span>}
              {entry.notes.length > (entry.journal ? 1 : 0) && (
                <span className="chip">노트 {entry.notes.length - (entry.journal ? 1 : 0)}</span>
              )}
              {entry.schedules.length > 0 && (
                <span className="chip">일정 {entry.schedules.length}</span>
              )}
              {photos.length > 0 && <span className="chip">사진 {photos.length}</span>}
            </span>
            <span
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                whiteSpace: 'pre-line',
                wordBreak: 'break-word',
                color: 'var(--text-2)',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <Highlight text={preview} query={query} />
            </span>
          </span>
          {photos.length > 0 ? (
            <span className="journal-list-row-thumbs" aria-hidden="true">
              {photos.slice(0, 2).map((photo, index) => (
                <img
                  key={index}
                  src={photo.data}
                  alt=""
                  loading="lazy"
                  style={{
                    width: 44,
                    height: 44,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                  }}
                />
              ))}
              {photos.length > 2 && (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>+{photos.length - 2}</span>
              )}
            </span>
          ) : (
            <span />
          )}
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={() => onToggle(entry.date)}
          aria-expanded={expanded}
          style={{ alignSelf: 'center', margin: '0 10px', whiteSpace: 'nowrap' }}
        >
          {expanded ? '접기' : '펼치기'}
        </button>
      </div>
      {expanded && (
        <EntryDetail entry={entry} query={query} photos={photos} onPhotoClick={onPhotoClick} />
      )}
    </div>
  );
}
