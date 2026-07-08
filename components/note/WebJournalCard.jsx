'use client';
import { Icon } from '@/components/icons';
import { STATUS_COLORS } from '@/lib/note/constants';
import {
  isJournalNote,
  noteDetailPairs,
  noteDisplayTitle,
  notePrimaryContentLabel,
} from '@/lib/note/display';

function ReportSections({ sections }) {
  const filled = sections.filter(([, v]) => v);
  if (!filled.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {filled.map(([label, value], index) => (
        <section
          key={label}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 12px',
            background: index === 0 ? 'var(--surface-2)' : 'var(--surface)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--text-2)',
              marginBottom: 6,
            }}
          >
            {index + 1}. {label}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              color: 'var(--text-1)',
            }}
          >
            {value}
          </div>
        </section>
      ))}
    </div>
  );
}

function tagList(tags) {
  if (Array.isArray(tags)) return tags.map(tag => String(tag || '').trim()).filter(Boolean);
  return String(tags || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function isSampleRecord(note) {
  return note?._recordKind === 'sample' || String(note?.id || '').startsWith('sample:');
}

function metaPairs(note) {
  const pairs = [];
  if (note?.testDate) pairs.push(['작성일', note.testDate]);
  if (isSampleRecord(note)) {
    const type = note?.recordType || note?.noteType;
    if (type) pairs.push(['유형', type]);
    if (note?.category) pairs.push(['식자재 분류', note.category]);
    return pairs;
  }
  if (note?.category) pairs.push(['구분', note.category]);
  return pairs;
}

export function WebJournalCard({ note, index, onEdit }) {
  const statusStyle = STATUS_COLORS[note.status] || {};
  const title = noteDisplayTitle(note, '(제목 없음)');
  const contentLabel = notePrimaryContentLabel(note);
  const detailPairs = noteDetailPairs(note);
  const reportLabel = isJournalNote(note) ? '오늘 한 일 보고서' : '관련 테스트 보고';
  const sections = [[contentLabel, note.testContent], ...detailPairs];
  const tags = tagList(note.tags);
  const meta = metaPairs(note);

  return (
    <article className="card" style={{ overflow: 'hidden', padding: 0 }}>
      {/* 헤더 */}
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--divider)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 3 }}>
            {reportLabel} #{index}
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-1)' }}>{title}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {note.noteType && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--accent-soft)',
                color: 'var(--accent-text)',
              }}
            >
              {note.noteType}
            </span>
          )}
          {note.status && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                ...statusStyle,
              }}
            >
              {note.status}
            </span>
          )}
          <button className="btn sm" onClick={onEdit} title="수정">
            <Icon.edit style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* 메타 */}
      <div
        style={{
          padding: '8px 16px',
          fontSize: 13,
          color: 'var(--text-2)',
          display: 'flex',
          gap: 16,
          borderBottom: '1px solid var(--divider)',
          flexWrap: 'wrap',
        }}
      >
        {meta.map(([label, value]) => (
          <span key={label}>
            <b>{label}:</b> {value}
          </span>
        ))}
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ReportSections sections={sections} />

        {/* 사진 */}
        {note.photos?.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                marginBottom: 8,
              }}
            >
              첨부 사진 ({note.photos.length}장)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {note.photos.map((p, i) => (
                <div key={i}>
                  <img
                    src={p.data}
                    alt={p.caption || p.name}
                    style={{
                      width: '100%',
                      aspectRatio: '4/3',
                      objectFit: 'contain',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      display: 'block',
                    }}
                  />
                  {p.caption && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-3)',
                        marginTop: 3,
                        textAlign: 'center',
                      }}
                    >
                      {p.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 태그 */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map(t => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--surface-2)',
                  color: 'var(--text-3)',
                }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
