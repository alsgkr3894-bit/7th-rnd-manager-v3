import { withDownloadDateSuffix } from '@/lib/download';
import { noteDisplayTitle } from '@/lib/note/display';
import { STATUS_COLORS } from '@/lib/note/constants';
import { buildAutoPrintScript } from '@/lib/print/window-print';

function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function txt(s) {
  return esc(s).replace(/\n/g, '<br>');
}

export function buildJournalPrintHtml(dateLabel, dayNotes) {
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
                  `<div class="photo-wrap"><img src="${esc(p.data)}" alt="${esc(p.caption || p.name || '')}">${p.caption ? `<div class="photo-caption">${esc(p.caption)}</div>` : ''}</div>`
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
          <div class="note-title">${esc(noteDisplayTitle(note, '(제목 없음)'))}</div>
          <div class="note-chips">
            ${note.noteType ? `<span class="chip chip-type">${esc(note.noteType)}</span>` : ''}
            ${note.status ? `<span class="chip" style="${statusStyle}">${esc(note.status)}</span>` : ''}
          </div>
        </div>
        <div class="note-meta">
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
    margin-bottom: 10px;
    overflow: visible;
  }
  .note-header {
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    break-after: avoid;
    break-inside: avoid;
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
    padding: 8px 12px;
    border-top: 1px solid #eee;
  }
  .photo-wrap { break-inside: avoid; page-break-inside: avoid; }
  .photo-wrap img {
    width: 100%;
    max-height: 200px;
    object-fit: contain;
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
      <div class="doc-date">${esc(dateLabel)}</div>
    </div>
  </div>

  ${noteCards}

  <div class="doc-footer">
    7번가피자 R&amp;D 플랫폼 · ${new Date().toLocaleDateString('ko-KR')} 출력
  </div>
  ${buildAutoPrintScript()}
</body>
</html>`;
}
