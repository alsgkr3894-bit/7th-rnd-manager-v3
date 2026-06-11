'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { getAllNotes } from '@/lib/note';
import { withDownloadDateSuffix } from '@/lib/download';
import { STATUS_COLORS } from '@/lib/note/constants';
import { showToast } from '@/components/Toast';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${dateStr} (${DAY_LABELS[d.getDay()]})`;
}

// ── PDF 팝업 생성 ────────────────────────────────────────────

/** HTML 특수문자 escape (XSS 방지 + 출력 깨짐 방지) */
function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 텍스트 → HTML (escape 후 줄바꿈을 <br>로 변환) */
function txt(s) {
  return esc(s).replace(/\n/g, '<br>');
}

function buildPrintHtml(dateLabel, dayNotes) {
  const noteCards = dayNotes
    .map((note, idx) => {
      const statusStyle = STATUS_COLORS[note.status]
        ? `background:${STATUS_COLORS[note.status].bg};color:${STATUS_COLORS[note.status].color};`
        : 'background:#f3f3f3;color:#555;';

      const twoCol = pairs => {
        const filled = pairs.filter(([, v]) => v);
        if (!filled.length) return '';
        return `<div class="two-col">${filled
          .map(
            ([l, v]) =>
              `<div class="field"><div class="field-label">${esc(l)}</div><div class="field-body">${txt(v)}</div></div>`
          )
          .join('')}</div>`;
      };

      const photos =
        (note.photos || []).length > 0
          ? `<div class="photos">${(note.photos || [])
              .map(
                p =>
                  `<div class="photo-wrap"><img src="${p.data}" alt="${esc(p.caption || p.name || '')}">${p.caption ? `<div class="photo-caption">${esc(p.caption)}</div>` : ''}</div>`
              )
              .join('')}</div>`
          : '';

      const tags = (note.tags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => `<span class="tag">#${esc(t)}</span>`)
        .join('');

      return `
      <div class="note-card">
        <div class="note-header">
          <div class="note-num">No.${idx + 1}</div>
          <div class="note-title">${esc(note.title) || '(제목 없음)'}</div>
          <div class="note-chips">
            ${note.noteType ? `<span class="chip chip-type">${esc(note.noteType)}</span>` : ''}
            ${note.status ? `<span class="chip" style="${statusStyle}">${esc(note.status)}</span>` : ''}
          </div>
        </div>
        <div class="note-meta">
          ${note.menuName ? `<span><b>메뉴:</b> ${esc(note.menuName)}</span>` : ''}
          ${note.category ? `<span><b>구분:</b> ${esc(note.category)}</span>` : ''}
        </div>
        ${note.testContent ? `<div class="test-content"><div class="field-label">핵심 테스트 내용</div><div>${txt(note.testContent)}</div></div>` : ''}
        ${twoCol([
          ['사용 재료', note.materials],
          ['맛 평가', note.tasteEval],
          ['상무님 평가', note.managerEval],
          ['원가 검토', note.costNote],
          ['개선점', note.improvements],
          ['다음 액션', note.nextAction],
        ])}
        ${photos}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(withDownloadDateSuffix(`연구일지 ${dateLabel}`))}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif;
    font-size: 11pt;
    color: #111;
    background: #fff;
    padding: 0;
  }
  @page { size: A4 portrait; margin: 18mm 16mm; }

  /* ── 문서 헤더 ── */
  .doc-header {
    border-bottom: 2.5px solid #111;
    padding-bottom: 10px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .doc-title { font-size: 22pt; font-weight: 800; letter-spacing: -0.02em; }
  .doc-sub { font-size: 10pt; color: #555; margin-top: 3px; }
  .doc-date { font-size: 12pt; font-weight: 700; text-align: right; }
  .doc-count { font-size: 10pt; color: #555; }

  /* ── 노트 카드 ── */
  .note-card {
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 16px;
    page-break-inside: avoid;
    overflow: hidden;
  }
  .note-header {
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .note-num {
    font-size: 10pt; font-weight: 800; color: #555;
    min-width: 32px;
  }
  .note-title { font-size: 13pt; font-weight: 700; flex: 1; }
  .note-chips { display: flex; gap: 4px; flex-shrink: 0; }
  .chip {
    font-size: 8.5pt; font-weight: 700;
    padding: 2px 7px; border-radius: 999px;
    white-space: nowrap;
  }
  .chip-type { background: #dbeafe; color: #1d4ed8; }

  .note-meta {
    padding: 5px 12px;
    font-size: 10pt;
    color: #444;
    display: flex;
    gap: 16px;
    border-bottom: 1px solid #eee;
  }

  .test-content {
    padding: 9px 12px;
    background: #fafafa;
    border-bottom: 1px solid #eee;
    font-size: 10.5pt;
    line-height: 1.7;
  }

  .field-label {
    font-size: 8.5pt;
    font-weight: 700;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 3px;
  }
  .field { padding: 8px 12px; }
  .field-body { font-size: 10pt; line-height: 1.65; }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid #eee;
  }
  .two-col .field { border-right: 1px solid #eee; }
  .two-col .field:nth-child(even) { border-right: none; }

  /* ── 사진 ── */
  .photos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 10px 12px;
    border-top: 1px solid #eee;
    page-break-inside: avoid;
  }
  .photo-wrap img {
    width: 100%;
    aspect-ratio: 4/3;
    object-fit: cover;
    border-radius: 3px;
    display: block;
  }
  .photo-caption {
    font-size: 8pt;
    color: #777;
    margin-top: 2px;
    text-align: center;
  }

  /* ── 태그 ── */
  .tags {
    padding: 6px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    border-top: 1px solid #eee;
  }
  .tag {
    font-size: 8.5pt;
    padding: 1px 6px;
    border-radius: 999px;
    background: #f3f3f3;
    color: #555;
  }

  /* ── 푸터 ── */
  .doc-footer {
    margin-top: 20px;
    padding-top: 8px;
    border-top: 1px solid #ccc;
    font-size: 9pt;
    color: #aaa;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="doc-title">연구일지</div>
      <div class="doc-sub">7번가피자 R&amp;D · 총 ${dayNotes.length}건 테스트</div>
    </div>
    <div style="text-align:right">
      <div class="doc-date">${dateLabel}</div>
    </div>
  </div>

  ${noteCards}

  <div class="doc-footer">
    7번가피자 R&amp;D 플랫폼 · ${new Date().toLocaleDateString('ko-KR')} 출력
  </div>
  <script>window.onload = function() { window.focus(); window.print(); };</script>
</body>
</html>`;
}

function openPrintWindow(dateLabel, dayNotes) {
  const html = buildPrintHtml(dateLabel, dayNotes);
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    showToast('팝업이 차단됐습니다. 팝업 허용 후 다시 시도해 주세요.', 'warn');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ── 메인 페이지 ─────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    await initDB();
    setNotes(await getAllNotes());
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  const dayNotes = useMemo(
    () =>
      notes
        .filter(n => (n.testDate || n.createdAt || '').slice(0, 10) === date)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [notes, date]
  );

  const datesWithNotes = useMemo(() => {
    const s = new Set();
    notes.forEach(n => {
      const d = (n.testDate || n.createdAt || '').slice(0, 10);
      if (d) s.add(d);
    });
    return [...s].sort().reverse();
  }, [notes]);

  function goPrev() {
    const idx = datesWithNotes.indexOf(date);
    if (idx < datesWithNotes.length - 1) setDate(datesWithNotes[idx + 1]);
  }
  function goNext() {
    const idx = datesWithNotes.indexOf(date);
    if (idx > 0) setDate(datesWithNotes[idx - 1]);
  }

  const hasPrev = datesWithNotes.indexOf(date) < datesWithNotes.length - 1;
  const hasNext = datesWithNotes.indexOf(date) > 0;
  const dateLabel = toDateLabel(date);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴개발노트', '연구일지']}
        title="연구일지"
        sub={loading ? '로딩 중…' : `${dateLabel} · ${dayNotes.length}건`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" onClick={goPrev} disabled={!hasPrev} title="이전 일자">
              <Icon.arrowUp style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
            </button>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => {
                if (e.target.value) setDate(e.target.value);
              }}
              style={{ width: 148 }}
            />
            <button className="btn" onClick={goNext} disabled={!hasNext} title="다음 일자">
              <Icon.arrowDown style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
            </button>
            {dayNotes.length > 0 && (
              <button className="btn primary" onClick={() => openPrintWindow(dateLabel, dayNotes)}>
                <Icon.download style={{ width: 14, height: 14 }} /> PDF 출력
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: 20,
                height: 100,
                background: 'var(--surface-2)',
                borderColor: 'transparent',
                opacity: 1 - i * 0.15,
              }}
            />
          ))}
        </div>
      ) : dayNotes.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 12 }}>
            {date}에 작성된 테스트 노트가 없습니다.
          </div>
          <button className="btn primary" onClick={() => router.push('/note/write')}>
            <Icon.plus style={{ width: 14, height: 14 }} /> 노트 작성
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {dayNotes.map((note, idx) => (
            <WebJournalCard
              key={note.id}
              note={note}
              index={idx + 1}
              onEdit={() => router.push(`/note/${note.id}`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

// ── 웹 뷰 카드 ──────────────────────────────────────────────
function WebJournalCard({ note, index, onEdit }) {
  const statusStyle = STATUS_COLORS[note.status] || {};

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      {/* 헤더 */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--divider)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--text-3)',
            minWidth: 30,
          }}
        >
          No.{index}
        </span>
        <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
          {note.title || '(제목 없음)'}
        </span>
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
      {(note.menuName || note.category) && (
        <div
          style={{
            padding: '6px 16px',
            fontSize: 13,
            color: 'var(--text-2)',
            display: 'flex',
            gap: 16,
            borderBottom: '1px solid var(--divider)',
          }}
        >
          {note.menuName && (
            <span>
              <b>메뉴:</b> {note.menuName}
            </span>
          )}
          {note.category && (
            <span>
              <b>구분:</b> {note.category}
            </span>
          )}
        </div>
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 핵심 내용 */}
        {note.testContent && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                marginBottom: 6,
              }}
            >
              핵심 테스트 내용
            </div>
            <div
              style={{
                background: 'var(--surface-2)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                lineHeight: 1.75,
                whiteSpace: 'pre-wrap',
              }}
            >
              {note.testContent}
            </div>
          </div>
        )}

        {/* 2열 필드 */}
        <TwoColFields
          pairs={[
            ['사용 재료', note.materials],
            ['맛 평가', note.tasteEval],
            ['상무님 평가', note.managerEval],
            ['원가 검토', note.costNote],
            ['개선점', note.improvements],
            ['다음 액션', note.nextAction],
          ]}
        />

        {/* 사진 */}
        {note.photos?.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                marginBottom: 8,
              }}
            >
              사진 ({note.photos.length}장)
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
                      objectFit: 'cover',
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
        {note.tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {note.tags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
              .map(t => (
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
    </div>
  );
}

function TwoColFields({ pairs }) {
  const filled = pairs.filter(([, v]) => v);
  if (!filled.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
      {filled.map(([label, value]) => (
        <div key={label}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              marginBottom: 4,
            }}
          >
            {label}
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
        </div>
      ))}
    </div>
  );
}
