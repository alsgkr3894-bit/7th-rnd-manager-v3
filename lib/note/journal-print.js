import { withDownloadDateSuffix } from '@/lib/download';
import {
  isJournalNote,
  noteDetailPairs,
  noteDisplayTitle,
  notePrimaryContentLabel,
} from '@/lib/note/display';
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

export function buildJournalPrintHtml(dateLabel, dayNotes, options = {}) {
  const docTitle = options.title || '오늘 한 일 보고서';
  const noteCards = dayNotes
    .map((note, idx) => {
      const statusStyle = STATUS_COLORS[note.status]
        ? `background:${STATUS_COLORS[note.status].bg};color:${STATUS_COLORS[note.status].color};`
        : 'background:#f3f3f3;color:#555;';
      const contentLabel = notePrimaryContentLabel(note);
      const detailPairs = noteDetailPairs(note);

      const reportSections = sections => {
        const filled = sections.filter(([, v]) => v);
        if (!filled.length) return '';
        return `<div class="report-sections">${filled
          .map(
            ([l, v], sectionIndex) =>
              `<section class="report-section"><div class="section-label">${sectionIndex + 1}. ${esc(l)}</div><div class="section-body">${txt(v)}</div></section>`
          )
          .join('')}</div>`;
      };

      const photoItems = (Array.isArray(note.photos) ? note.photos : []).filter(
        photo => photo?.data
      );
      const photos =
        photoItems.length > 0
          ? `<div class="photos">${photoItems
              .map(
                p =>
                  `<div class="photo-wrap"><img src="${esc(p.data)}" alt="${esc(p.caption || p.name || '연구일지 사진')}" loading="eager" decoding="sync">${p.caption ? `<div class="photo-caption">${esc(p.caption)}</div>` : ''}</div>`
              )
              .join('')}</div>`
          : '';

      const tags = tagList(note.tags)
        .map(t => `<span class="tag">#${esc(t)}</span>`)
        .join('');
      const reportLabel = isJournalNote(note) ? '오늘 한 일 보고서' : '관련 테스트 보고';
      const sections = [[contentLabel, note.testContent], ...detailPairs];
      const meta = metaPairs(note)
        .map(([label, value]) => `<span><b>${esc(label)}:</b> ${esc(value)}</span>`)
        .join('');

      return `
      <article class="report-card">
        <div class="report-card-header">
          <div>
            <div class="report-kicker">${esc(reportLabel)} #${idx + 1}</div>
            <div class="report-title">${esc(noteDisplayTitle(note, '(제목 없음)'))}</div>
          </div>
          <div class="note-chips">
            ${note.noteType ? `<span class="chip chip-type">${esc(note.noteType)}</span>` : ''}
            ${note.status ? `<span class="chip" style="${statusStyle}">${esc(note.status)}</span>` : ''}
          </div>
        </div>
        <div class="report-meta">
          ${meta}
        </div>
        ${reportSections(sections)}
        ${photos}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </article>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(withDownloadDateSuffix(`R&D 연구일지 ${dateLabel}.pdf`))}</title>
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

  .doc-header {
    border: 2px solid #111;
    padding: 14px 16px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .doc-title { font-size: 23pt; font-weight: 800; letter-spacing: 0; }
  .doc-sub { font-size: 10pt; color: #555; margin-top: 4px; }
  .doc-date { font-size: 12pt; font-weight: 700; text-align: right; }
  .summary-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid #ccc;
    border-bottom: none;
    margin-bottom: 12px;
  }
  .summary-cell {
    padding: 8px 10px;
    border-right: 1px solid #ccc;
    font-size: 10pt;
  }
  .summary-cell:last-child { border-right: none; }
  .summary-label {
    display: block;
    color: #666;
    font-size: 8.5pt;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .report-card {
    border: 1px solid #bbb;
    border-radius: 4px;
    margin-bottom: 12px;
    overflow: visible;
    page-break-inside: avoid;
  }
  .report-card-header {
    border-bottom: 1px solid #ccc;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: #f7f7f7;
    break-after: avoid;
    break-inside: avoid;
  }
  .report-kicker { font-size: 8.5pt; font-weight: 800; color: #444; margin-bottom: 2px; }
  .report-title { font-size: 14pt; font-weight: 800; }
  .note-chips { display: flex; gap: 4px; flex-shrink: 0; }
  .chip {
    font-size: 8.5pt; font-weight: 700;
    padding: 2px 7px; border-radius: 999px;
    white-space: nowrap;
  }
  .chip-type { background: #dbeafe; color: #1d4ed8; }

  .report-meta {
    padding: 7px 12px;
    font-size: 10pt;
    color: #444;
    display: flex;
    gap: 16px;
    border-bottom: 1px solid #eee;
  }

  .report-sections {
    display: grid;
    grid-template-columns: 1fr;
  }
  .report-section {
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
  }
  .section-label {
    font-size: 9pt;
    font-weight: 800;
    color: #333;
    margin-bottom: 4px;
  }
  .section-body {
    font-size: 10.5pt;
    line-height: 1.75;
    white-space: normal;
  }

  .photos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 10px 12px;
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
      <div class="doc-title">${esc(docTitle)}</div>
      <div class="doc-sub">7번가피자 R&amp;D 연구일지</div>
    </div>
    <div style="text-align:right">
      <div class="doc-date">${esc(dateLabel)}</div>
    </div>
  </div>

  <div class="summary-row">
    <div class="summary-cell"><span class="summary-label">대상 기간</span>${esc(dateLabel)}</div>
    <div class="summary-cell"><span class="summary-label">보고 건수</span>${dayNotes.length}건</div>
    <div class="summary-cell"><span class="summary-label">문서 구분</span>연구일지</div>
  </div>

  ${noteCards}

  <div class="doc-footer">
    7번가피자 R&amp;D 플랫폼 · ${new Date().toLocaleDateString('ko-KR')} 출력
  </div>
  ${buildAutoPrintScript({ waitForImages: true })}
</body>
</html>`;
}
