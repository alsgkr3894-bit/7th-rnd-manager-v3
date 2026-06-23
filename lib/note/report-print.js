import { withDownloadDateSuffix } from '@/lib/download';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';

const STATUS_STYLE = {
  아이디어: { bg: '#f3f4f6', color: '#374151' },
  샘플테스트: { bg: '#fef3c7', color: '#b45309' },
  메뉴테스트: { bg: '#e0e7ff', color: '#3730a3' },
  테스트중: { bg: '#dcfce7', color: '#166534' },
  재테스트: { bg: '#fff7ed', color: '#c2410c' },
  보고예정: { bg: '#f0ebff', color: '#6b3fcb' },
  출시예정: { bg: '#e0f2fe', color: '#0369a1' },
  보류: { bg: '#f3f4f6', color: '#6b7280' },
  출시: { bg: '#dcfce7', color: '#15803d' },
  폐기: { bg: '#fee2e2', color: '#b91c1c' },
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textHtml(value) {
  return esc(value).replace(/\n/g, '<br>');
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function parseReportTempCost(value) {
  try {
    if (!value) return { rows: [], sellingPrice: '' };
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return {
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      sellingPrice: parsed?.sellingPrice || '',
    };
  } catch {
    return { rows: [], sellingPrice: '' };
  }
}

function tempCostRowSubtotal(row) {
  return (Number(row?.quantity) || 0) * (Number(row?.unitPrice) || 0);
}

function calcReportTempCostSummary(rows, sellingPrice) {
  const totalCost = (Array.isArray(rows) ? rows : []).reduce(
    (sum, row) => sum + tempCostRowSubtotal(row),
    0
  );
  const sellNum = Number(sellingPrice) || 0;
  return {
    totalCost,
    costRate: sellNum > 0 ? (totalCost / sellNum) * 100 : null,
  };
}

function validDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatNoteReportDownloadDate(date = new Date()) {
  const safeDate = validDate(date);
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}`;
}

function noteSortKey(note) {
  return cleanText(note?.testDate || note?.updatedAt || note?.createdAt);
}

function sortNotesForReport(notes) {
  return [...(Array.isArray(notes) ? notes : [])].sort((a, b) =>
    noteSortKey(b).localeCompare(noteSortKey(a), 'ko')
  );
}

function countBy(notes, key) {
  const counts = new Map();
  for (const note of notes) {
    const label = cleanText(note?.[key]) || '미지정';
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
}

function groupByCategory(notes) {
  const groups = new Map();
  for (const note of notes) {
    const category = cleanText(note?.category) || '미지정';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(note);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'));
}

export function buildMenuDevelopmentReportSummary(notes) {
  const safeNotes = Array.isArray(notes) ? notes : [];
  const menuNames = new Set(safeNotes.map(note => cleanText(note?.menuName)).filter(Boolean));
  const photoCount = safeNotes.reduce(
    (sum, note) => sum + (Array.isArray(note?.photos) ? note.photos.length : 0),
    0
  );
  const tempCostCount = safeNotes.reduce((sum, note) => {
    const parsed = parseReportTempCost(note?.tempCostCalc);
    return sum + (parsed.rows.length > 0 ? 1 : 0);
  }, 0);

  return {
    total: safeNotes.length,
    menuCount: menuNames.size,
    photoCount,
    tempCostCount,
    statusCounts: countBy(safeNotes, 'status'),
    categoryCounts: countBy(safeNotes, 'category'),
  };
}

function countTable(title, rows) {
  const body = rows.length
    ? rows
        .map(([label, count]) => `<tr><td>${esc(label)}</td><td class="num">${count}</td></tr>`)
        .join('')
    : '<tr><td colspan="2" class="empty">집계할 항목이 없습니다</td></tr>';
  return `<section class="count-box">
    <h2>${esc(title)}</h2>
    <table><tbody>${body}</tbody></table>
  </section>`;
}

function chip(label, className = '') {
  if (!cleanText(label)) return '';
  return `<span class="chip ${esc(className)}">${esc(label)}</span>`;
}

function statusChip(status) {
  const safeStatus = cleanText(status) || '미지정';
  const style = STATUS_STYLE[safeStatus] || STATUS_STYLE.아이디어;
  return `<span class="chip" style="background:${style.bg};color:${style.color};">${esc(safeStatus)}</span>`;
}

function metaLine(note) {
  return [
    cleanText(note?.menuName) ? `메뉴 ${cleanText(note.menuName)}` : '',
    cleanText(note?.testDate) ? `테스트일 ${cleanText(note.testDate)}` : '',
    cleanText(note?.category) ? `구분 ${cleanText(note.category)}` : '',
    cleanText(note?.noteType) ? `유형 ${cleanText(note.noteType)}` : '',
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
}

function fieldGrid(fields) {
  const filled = fields.filter(([, value]) => cleanText(value));
  if (!filled.length) return '';
  return `<div class="field-grid">${filled
    .map(
      ([label, value]) => `<section class="field">
        <h4>${esc(label)}</h4>
        <div>${textHtml(value)}</div>
      </section>`
    )
    .join('')}</div>`;
}

function photoGrid(photos) {
  const safePhotos = (Array.isArray(photos) ? photos : []).filter(photo => photo?.data);
  if (!safePhotos.length) return '';
  return `<div class="photos">${safePhotos
    .map(
      photo => `<figure>
        <img src="${esc(photo.data)}" alt="${esc(photo.caption || photo.name || '노트 사진')}">
        ${photo.caption ? `<figcaption>${esc(photo.caption)}</figcaption>` : ''}
      </figure>`
    )
    .join('')}</div>`;
}

function tagList(tags) {
  const items = cleanText(tags)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
  if (!items.length) return '';
  return `<div class="tags">${items.map(tag => `<span>#${esc(tag)}</span>`).join('')}</div>`;
}

function tempCostSection(note) {
  const parsed = parseReportTempCost(note?.tempCostCalc);
  if (!parsed.rows.length) return '';
  const summary = calcReportTempCostSummary(parsed.rows, parsed.sellingPrice);
  const rows = parsed.rows
    .map(row => {
      const subtotal = tempCostRowSubtotal(row);
      return `<tr>
        <td>${esc(row.name || row.productCode || '미지정')}</td>
        <td class="num">${esc(row.quantity || '')}</td>
        <td>${esc(row.unit || '')}</td>
        <td class="num">${Number(row.unitPrice || 0).toLocaleString('ko-KR')}</td>
        <td class="num">${Math.round(subtotal).toLocaleString('ko-KR')}</td>
      </tr>`;
    })
    .join('');
  const sellingPrice = Number(parsed.sellingPrice || 0);
  const costRate =
    summary.costRate == null || !Number.isFinite(Number(summary.costRate))
      ? '—'
      : `${Number(summary.costRate).toFixed(1)}%`;

  return `<section class="temp-cost">
    <div class="temp-cost-head">
      <h4>임시 원가 계산</h4>
      <span>원가 ${Math.round(summary.totalCost).toLocaleString('ko-KR')}원 · 판매가 ${sellingPrice ? sellingPrice.toLocaleString('ko-KR') + '원' : '—'} · 원가율 ${esc(costRate)}</span>
    </div>
    <table>
      <thead><tr><th>재료</th><th class="num">수량</th><th>단위</th><th class="num">단가</th><th class="num">소계</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function noteCard(note, index) {
  const title = cleanText(note?.title) || cleanText(note?.menuName) || '제목 없음';
  const summary = cleanText(note?.reportSummary);
  return `<article class="note-card">
    <header class="note-head">
      <div>
        <div class="note-index">No. ${index + 1}</div>
        <h3>${esc(title)}</h3>
        <p>${metaLine(note) || '기본 정보 없음'}</p>
      </div>
      <div class="chips">
        ${statusChip(note?.status)}
        ${chip(note?.noteType, 'type')}
      </div>
    </header>
    ${
      summary
        ? `<section class="report-summary"><h4>보고용 요약</h4><div>${textHtml(summary)}</div></section>`
        : ''
    }
    ${fieldGrid([
      ['핵심 테스트 내용', note?.testContent],
      ['사용 재료', note?.materials],
      ['맛 평가', note?.tasteEval],
      ['상무님 평가', note?.managerEval],
      ['원가 검토', note?.costNote],
      ['이슈', note?.issues],
      ['개선점', note?.improvements],
      ['다음 액션', note?.nextAction],
    ])}
    ${tempCostSection(note)}
    ${photoGrid(note?.photos)}
    ${tagList(note?.tags)}
  </article>`;
}

export function buildMenuDevelopmentReportHtml(notes, options = {}) {
  const safeNotes = sortNotesForReport(notes);
  const now = validDate(options.now);
  const title = cleanText(options.title) || '메뉴개발노트 전체 보고서';
  const scopeLabel = cleanText(options.scopeLabel) || '현재 목록 전체';
  const printedDate = formatNoteReportDownloadDate(now);
  const documentTitle = withDownloadDateSuffix(title, now);
  const summary = buildMenuDevelopmentReportSummary(safeNotes);
  const groups = groupByCategory(safeNotes);
  let runningIndex = 0;
  const noteSections = groups.length
    ? groups
        .map(([category, rows]) => {
          const cards = rows
            .map(note => {
              const html = noteCard(note, runningIndex);
              runningIndex += 1;
              return html;
            })
            .join('');
          return `<section class="category-section">
            <div class="category-title"><h2>${esc(category)}</h2><span>${rows.length.toLocaleString('ko-KR')}건</span></div>
            ${cards}
          </section>`;
        })
        .join('')
    : '<section class="empty-report">출력할 메뉴개발노트가 없습니다.</section>';

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${esc(documentTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #111827; font-family: Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; font-size: 10.5pt; }
  .page { padding: 14mm 15mm; }
  .cover { border-bottom: 3px solid #111827; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; }
  h1 { margin: 0 0 5px; font-size: 22pt; letter-spacing: 0; }
  .meta { color: #4b5563; font-size: 9.5pt; line-height: 1.6; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin: 12px 0; }
  .summary-card { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 9px; }
  .summary-card span { display: block; color: #6b7280; font-size: 8.5pt; margin-bottom: 3px; }
  .summary-card strong { font-size: 13pt; }
  .count-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0 16px; }
  .count-box { border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
  .count-box h2 { margin: 0; background: #f3f4f6; padding: 7px 9px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-top: 1px solid #e5e7eb; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f9fafb; color: #374151; font-size: 8.5pt; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .category-section + .category-section { break-before: page; page-break-before: always; }
  .category-title { margin: 14px 0 8px; padding: 8px 10px; border: 1px solid #111827; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; break-after: avoid; page-break-after: avoid; }
  .category-title h2 { margin: 0; font-size: 14pt; }
  .category-title span { color: #4b5563; font-size: 9pt; font-weight: 800; }
  .note-card { border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 10px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .note-head { display: flex; justify-content: space-between; gap: 12px; padding: 9px 11px; background: #f3f4f6; border-bottom: 1px solid #d1d5db; }
  .note-index { color: #6b7280; font-size: 8.5pt; font-weight: 800; margin-bottom: 2px; }
  h3 { margin: 0; font-size: 13pt; letter-spacing: 0; }
  .note-head p { margin: 3px 0 0; color: #4b5563; font-size: 9pt; }
  .chips { display: flex; align-items: flex-start; gap: 4px; flex-wrap: wrap; justify-content: flex-end; min-width: 120px; }
  .chip { display: inline-flex; border-radius: 999px; padding: 2px 7px; font-size: 8pt; font-weight: 800; white-space: nowrap; background: #dbeafe; color: #1d4ed8; }
  .chip.type { background: #ecfdf5; color: #047857; }
  .report-summary { background: #fffbeb; border-bottom: 1px solid #fde68a; padding: 8px 11px; }
  h4 { margin: 0 0 4px; color: #374151; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0; }
  .report-summary div, .field div { line-height: 1.55; white-space: normal; overflow-wrap: anywhere; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .field { padding: 8px 11px; border-top: 1px solid #e5e7eb; }
  .field:nth-child(odd) { border-right: 1px solid #e5e7eb; }
  .temp-cost { padding: 8px 11px; border-top: 1px solid #e5e7eb; }
  .temp-cost-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
  .temp-cost-head span { color: #4b5563; font-size: 8.5pt; }
  .temp-cost table { font-size: 8.5pt; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; padding: 8px 11px; border-top: 1px solid #e5e7eb; }
  figure { margin: 0; break-inside: avoid; }
  img { width: 100%; max-height: 150px; object-fit: contain; display: block; border: 1px solid #e5e7eb; border-radius: 4px; }
  figcaption { color: #6b7280; font-size: 8pt; margin-top: 2px; text-align: center; }
  .tags { border-top: 1px solid #e5e7eb; padding: 7px 11px; display: flex; flex-wrap: wrap; gap: 5px; }
  .tags span { background: #f3f4f6; color: #4b5563; border-radius: 999px; padding: 2px 7px; font-size: 8pt; }
  .empty, .empty-report { color: #6b7280; text-align: center; padding: 24px; }
  .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #d1d5db; color: #9ca3af; text-align: center; font-size: 8.5pt; }
  @media print {
    @page { size: A4 portrait; margin: 12mm 12mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 0; }
  }
</style>
</head>
<body>
  <main class="page">
    <header class="cover">
      <div>
        <h1>${esc(title)}</h1>
        <div class="meta">${esc(scopeLabel)} · 카테고리별 상세 보고서</div>
      </div>
      <div class="meta" style="text-align:right">다운로드일 ${esc(printedDate)}<br>총 ${summary.total.toLocaleString('ko-KR')}건</div>
    </header>
    <section class="summary-grid">
      <div class="summary-card"><span>노트 수</span><strong>${summary.total.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>메뉴 수</span><strong>${summary.menuCount.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>사진 수</span><strong>${summary.photoCount.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>원가 계산</span><strong>${summary.tempCostCount.toLocaleString('ko-KR')}</strong></div>
    </section>
    <section class="count-grid">
      ${countTable('상태별 현황', summary.statusCounts)}
      ${countTable('카테고리별 현황', summary.categoryCounts)}
    </section>
    ${noteSections}
    <footer class="footer">7번가피자 R&amp;D 플랫폼 · 메뉴개발노트 PDF 보고서 · ${esc(printedDate)} 출력</footer>
  </main>
  ${buildAutoPrintScript({ waitForImages: true })}
</body>
</html>`;
}

export function printMenuDevelopmentReport(notes, options = {}) {
  return openPrintWindow(buildMenuDevelopmentReportHtml(notes, options), {
    width: 980,
    height: 1000,
  });
}
