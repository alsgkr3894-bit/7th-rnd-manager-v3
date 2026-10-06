import { withDownloadDateSuffix } from '@/lib/download';
import {
  isJournalNote,
  isMarketResearchNote,
  noteContentSections,
  noteDisplayTitle,
  noteMetaPairs,
  noteTagList,
} from '@/lib/note/display';
import { STATUS_COLORS } from '@/lib/note/constants';
import { buildAutoPrintScript } from '@/lib/print/window-print';
import { PARENT_COMPANY } from '@/lib/companies';
import { JOURNAL_PRINT_STYLES } from '@/lib/note/journal-print-styles';

// 대략 300자·8줄을 넘는 칸은 쪽 사이에서 나눠도 되게 표시한다(통째로 넘기면 앞 장 아래가 빈다)
export const LONG_SECTION_CHARS = 300;
export const LONG_SECTION_LINES = 8;
function sectionClass(value) {
  const text = String(value ?? '');
  const long = text.length > LONG_SECTION_CHARS || text.split('\n').length > LONG_SECTION_LINES;
  return long ? 'report-section long' : 'report-section';
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function txt(s) {
  return esc(s).replace(/\n/g, '<br>');
}

export function buildJournalPrintHtml(dateLabel, dayNotes, options = {}) {
  const docTitle = options.title || '오늘 내용 보고서';
  // 대표(모회사) 아래 어느 브랜드의 일지인지 표기 — 태명F&T 산하 3개 브랜드를 구분한다.
  const brandName = String(options.brandName ?? '').trim();
  // 인쇄 창은 about:blank라 상대경로가 풀리지 않는다 — 호출 측이 절대 URL을 넘긴다.
  const logoSrc = String(options.logoSrc ?? '').trim();
  const noteCards = dayNotes
    .map((note, idx) => {
      const statusStyle = STATUS_COLORS[note.status]
        ? `background:${STATUS_COLORS[note.status].bg};color:${STATUS_COLORS[note.status].color};`
        : 'background:#f3f3f3;color:#555;';

      const reportSections = sections => {
        const filled = sections.filter(([, v]) => v);
        if (!filled.length) return '';
        return `<div class="report-sections">${filled
          .map(
            ([l, v], sectionIndex) =>
              `<section class="${sectionClass(v)}"><div class="section-label">${sectionIndex + 1}. ${esc(l)}</div><div class="section-body">${txt(v)}</div></section>`
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

      const tags = noteTagList(note.tags)
        .map(t => `<span class="tag">#${esc(t)}</span>`)
        .join('');
      const reportLabel = isJournalNote(note)
        ? '오늘 내용 보고서'
        : isMarketResearchNote(note)
          ? '시장조사 보고'
          : '관련 테스트 보고';
      const sections = noteContentSections(note);
      const meta = noteMetaPairs(note)
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
${JOURNAL_PRINT_STYLES}</style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="doc-title">${esc(docTitle)}</div>
      <div class="doc-sub">${esc(PARENT_COMPANY.name)} R&amp;D 연구일지</div>
      ${brandName ? `<div class="doc-brand">브랜드 : ${esc(brandName)}</div>` : ''}
    </div>
    <div style="text-align:right">
      ${logoSrc ? `<img class="doc-logo" src="${esc(logoSrc)}" alt="${esc(PARENT_COMPANY.name)}">` : ''}
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
    ${esc(PARENT_COMPANY.name)} R&amp;D 플랫폼 · ${new Date().toLocaleDateString('ko-KR')} 출력
  </div>
  ${buildAutoPrintScript({ waitForImages: true })}
</body>
</html>`;
}
