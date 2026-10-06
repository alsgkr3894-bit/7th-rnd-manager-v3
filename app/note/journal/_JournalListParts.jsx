'use client';

// 연구일지 목록 — 검색어 강조·사진 썸네일·날짜 펼친 내용 (_JournalMonthList.jsx에서 분리)
import { journalReportFromEntry } from './journalForm';
import { splitHighlight } from './journalSearch';

const S_MARK = {
  background: 'var(--warn-soft)',
  color: 'inherit',
  borderRadius: 3,
  padding: '0 1px',
};
const S_SUB_LABEL = { fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 4 };

export function Highlight({ text, query }) {
  return splitHighlight(text, query).map((part, index) =>
    part.match ? (
      <mark key={index} style={S_MARK}>
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    )
  );
}

export function PhotoThumb({ photo, size, onClick }) {
  const label = photo.caption || photo.name || '사진';
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={`${label} 크게 보기`}
      style={{
        width: size,
        height: size,
        padding: 0,
        border: '1px solid var(--border)',
        borderRadius: 6,
        overflow: 'hidden',
        background: 'var(--surface-2)',
        cursor: 'zoom-in',
        flexShrink: 0,
      }}
    >
      <img
        src={photo.data}
        alt={label}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </button>
  );
}

export function EntryDetail({ entry, query, photos, onPhotoClick }) {
  const report = entry.journal ? journalReportFromEntry(entry.journal) : '';
  const otherNotes = entry.notes.filter(note => note !== entry.journal);
  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 12px 14px',
        display: 'grid',
        gap: 12,
      }}
    >
      {report ? (
        <div>
          <div style={S_SUB_LABEL}>오늘 내용 보고서</div>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 13,
              lineHeight: 1.7,
              color: 'var(--text-1)',
            }}
          >
            <Highlight text={report} query={query} />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          이 날은 연구일지를 쓰지 않았습니다.
        </div>
      )}

      {otherNotes.length > 0 && (
        <div>
          <div style={S_SUB_LABEL}>노트·샘플·시장조사 {otherNotes.length}건</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-2)' }}>
            {otherNotes.map((note, index) => (
              <li key={note.id ?? index}>
                {note.noteType && (
                  <span style={{ color: 'var(--text-3)', marginRight: 6 }}>[{note.noteType}]</span>
                )}
                <Highlight text={note.title || note.menuName || '(제목 없음)'} query={query} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.schedules.length > 0 && (
        <div>
          <div style={S_SUB_LABEL}>일정 {entry.schedules.length}건</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-2)' }}>
            {entry.schedules.map(schedule => (
              <li key={`${schedule.id}-${schedule._occurrenceDate}`}>
                {schedule.time && (
                  <span style={{ color: 'var(--accent-text)', marginRight: 6 }}>
                    {schedule.time}
                  </span>
                )}
                <Highlight text={schedule.title} query={query} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <div style={S_SUB_LABEL}>사진 {photos.length}장</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {photos.map((photo, index) => (
              <PhotoThumb
                key={`${index}-${photo.name || ''}`}
                photo={photo}
                size={88}
                onClick={() => onPhotoClick?.(photo)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
