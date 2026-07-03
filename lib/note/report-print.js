import { withDownloadDateSuffix } from '@/lib/download';
import { noteDisplayTitle } from '@/lib/note/display';
import { normalizeNoteStatus, normalizeNoteType } from '@/lib/note/constants';
import { formatNoteRating, formatTestRound, NOTE_EVALUATION_FIELDS } from '@/lib/note/evaluation';
import { buildEffectiveNoteStatusById, countNotesByStatus } from '@/lib/note/filter';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';

const STATUS_STYLE = {
  테스트: { bg: '#e0e7ff', color: '#3730a3' },
  아이디어: { bg: '#f3f4f6', color: '#374151' },
  샘플테스트: { bg: '#fef3c7', color: '#b45309' },
  메뉴테스트: { bg: '#e0e7ff', color: '#3730a3' },
  테스트중: { bg: '#dcfce7', color: '#166534' },
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

function timeValue(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function keyText(value) {
  return value == null ? '' : String(value);
}

function reportRoundNumber(note = {}) {
  const source = [note.testRound, note.title, note.menuName].map(cleanText).find(Boolean) || '';
  const match = source.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function compareReportRounds(a = {}, b = {}) {
  const ar = reportRoundNumber(a);
  const br = reportRoundNumber(b);
  if (ar && br && ar !== br) return ar - br;
  if (ar && !br) return -1;
  if (!ar && br) return 1;
  return (
    timeValue(a.testDate || a.createdAt || a.updatedAt) -
      timeValue(b.testDate || b.createdAt || b.updatedAt) ||
    keyText(a.id).localeCompare(keyText(b.id), 'ko', { numeric: true })
  );
}

function reportBaseTitle(note = {}) {
  const title = noteDisplayTitle(note, '');
  return (
    title
      .replace(/\s*[\-–—_/|]*\s*\(?\d+\s*(차|회차|차수|차 테스트|차시)\)?\s*$/u, '')
      .replace(/\s*\(?테스트\s*\d+\s*(차|회차|차수)?\)?\s*$/u, '')
      .trim() || title
  );
}

function findReportChainRoot(note, byId) {
  let current = note;
  const seen = new Set();
  while (current?.id != null) {
    const currentId = keyText(current.id);
    const parentId = keyText(current.parentId);
    if (!parentId || seen.has(parentId)) break;
    seen.add(currentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    current = parent;
  }
  return current || note;
}

function reportGroupKey(note, byId, parentIds, index) {
  const id = keyText(note?.id);
  const parentId = keyText(note?.parentId);
  const root = findReportChainRoot(note, byId);
  const rootId = keyText(root?.id);
  const isChained = Boolean(parentId || parentIds.has(id) || (rootId && rootId !== id));
  return isChained ? `chain:${rootId || parentId || id || index}` : `note:${id || index}`;
}

function compactDate(value) {
  return cleanText(value).slice(0, 10);
}

function koreanDate(value) {
  const date = compactDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split('-');
  return `${year}년${month}월${day}일`;
}

function reportPeriodLabel(notes = []) {
  const dates = notes.map(note => compactDate(note?.testDate)).filter(Boolean).sort();
  if (!dates.length) return '';
  return dates[0] === dates[dates.length - 1]
    ? koreanDate(dates[0])
    : `${koreanDate(dates[0])} ~ ${koreanDate(dates[dates.length - 1])}`;
}

function buildReportMenuGroups(notes = []) {
  const list = Array.isArray(notes) ? notes.filter(Boolean) : [];
  const byId = new Map();
  const parentIds = new Set();
  list.forEach(note => {
    const id = keyText(note?.id);
    const parentId = keyText(note?.parentId);
    if (id) byId.set(id, note);
    if (parentId) parentIds.add(parentId);
  });

  const map = new Map();
  list.forEach((note, index) => {
    const key = reportGroupKey(note, byId, parentIds, index);
    if (!map.has(key)) map.set(key, { key, notes: [] });
    map.get(key).notes.push(note);
  });

  return [...map.values()]
    .map(group => {
      const ordered = [...group.notes].sort(compareReportRounds);
      const lastRoundNote = ordered[ordered.length - 1] || {};
      const representative = selectRepresentativeReportNote(ordered) || lastRoundNote;
      return {
        ...group,
        notes: ordered,
        title: reportBaseTitle(lastRoundNote) || reportBaseTitle(representative) || '제목 없음',
        category: cleanText(lastRoundNote.category || representative.category) || '미지정',
        menuCode: cleanText(lastRoundNote.menuCode || representative.menuCode),
        periodLabel: reportPeriodLabel(ordered),
        representative,
        lastRoundNote,
      };
    })
    .sort((a, b) => noteSortKey(b.lastRoundNote).localeCompare(noteSortKey(a.lastRoundNote), 'ko'));
}

function selectRepresentativeReportNote(notes = []) {
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    if (normalizeNoteStatus(notes[index]?.status) === '출시') return notes[index];
  }
  return notes[notes.length - 1] || null;
}

function countBy(notes, key) {
  const counts = new Map();
  for (const note of notes) {
    const rawLabel = key === 'status' ? normalizeNoteStatus(note?.[key]) : note?.[key];
    const label = cleanText(rawLabel) || '미지정';
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
}

function countStatusRows(notes) {
  const counts = countNotesByStatus(notes);
  return Object.entries(counts)
    .filter(([label, count]) => label !== 'all' && count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
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
  const titles = new Set(safeNotes.map(note => noteDisplayTitle(note, '')).filter(Boolean));
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
    menuCount: titles.size,
    photoCount,
    tempCostCount,
    statusCounts: countStatusRows(safeNotes),
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
  const safeStatus = cleanText(normalizeNoteStatus(status)) || '미지정';
  const style = STATUS_STYLE[safeStatus] || STATUS_STYLE.테스트;
  return `<span class="chip" style="background:${style.bg};color:${style.color};">${esc(safeStatus)}</span>`;
}

function metaLine(note) {
  return [
    cleanText(note?.testDate) ? `테스트일 ${cleanText(note.testDate)}` : '',
    formatTestRound(note?.testRound),
    cleanText(note?.category) ? `구분 ${cleanText(note.category)}` : '',
    cleanText(note?.noteType) ? `유형 ${cleanText(normalizeNoteType(note.noteType))}` : '',
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
}

function menuMetaLine(group) {
  return [
    group.periodLabel,
    group.menuCode ? `코드 ${group.menuCode}` : '',
    `${group.notes.length}개 차수`,
    group.category ? `구분 ${group.category}` : '',
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

function selectMenuPhotos(notes = [], limit = 3) {
  const selected = [];
  for (let index = notes.length - 1; index >= 0 && selected.length < limit; index -= 1) {
    const photos = (Array.isArray(notes[index]?.photos) ? notes[index].photos : []).filter(
      photo => photo?.data
    );
    for (const photo of photos) {
      selected.push(photo);
      if (selected.length >= limit) break;
    }
  }
  return selected;
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

function roundCard(note, index, effectiveStatus) {
  const title = noteDisplayTitle(note);
  const summary = cleanText(note?.reportSummary);
  const ratingFields = NOTE_EVALUATION_FIELDS.map(item => [
    `${item.label} 별점`,
    formatNoteRating(note?.[item.key]),
  ]);
  return `<section class="round-card">
    <header class="round-head">
      <div>
        <div class="note-index">${formatTestRound(note?.testRound) || `${index + 1}차`}</div>
        <h3>${esc(title)}</h3>
        <p>${metaLine(note) || '기본 정보 없음'}</p>
      </div>
      <div class="chips">
        ${statusChip(effectiveStatus || note?.status)}
        ${chip(normalizeNoteType(note?.noteType), 'type')}
      </div>
    </header>
    ${
      summary
        ? `<section class="report-summary"><h4>보고용 요약</h4><div>${textHtml(summary)}</div></section>`
        : ''
    }
    ${fieldGrid([
      ...ratingFields,
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
    ${tagList(note?.tags)}
  </section>`;
}

function menuGroupCard(group, index, effectiveStatusById) {
  const effectiveStatus = effectiveStatusById.get(group.representative?.id);
  const photos = selectMenuPhotos(group.notes, 3);
  const rounds = group.notes
    .map((note, roundIndex) => roundCard(note, roundIndex, effectiveStatusById.get(note?.id)))
    .join('');
  return `<article class="note-card">
    <header class="note-head">
      <div>
        <div class="note-index">Menu ${index + 1}</div>
        <h3>${esc(group.title)}</h3>
        <p>${menuMetaLine(group) || '기본 정보 없음'}</p>
      </div>
      <div class="chips">
        ${statusChip(effectiveStatus || group.representative?.status)}
        ${chip(formatTestRound(group.lastRoundNote?.testRound), 'type')}
      </div>
    </header>
    ${photos.length ? `<section class="menu-photos"><h4>대표 사진</h4>${photoGrid(photos)}</section>` : ''}
    <section class="round-list">${rounds}</section>
  </article>`;
}

export function buildMenuDevelopmentReportHtml(notes, options = {}) {
  const safeNotes = Array.isArray(notes) ? notes.filter(Boolean) : [];
  const menuGroups = buildReportMenuGroups(safeNotes);
  const now = validDate(options.now);
  const title = cleanText(options.title) || '메뉴개발노트 전체 보고서';
  const scopeLabel = cleanText(options.scopeLabel) || '현재 목록 전체';
  const printedDate = formatNoteReportDownloadDate(now);
  const documentTitle = withDownloadDateSuffix(title, now);
  const summary = buildMenuDevelopmentReportSummary(safeNotes);
  const effectiveStatusById = buildEffectiveNoteStatusById(safeNotes);
  const groups = groupByCategory(menuGroups);
  let runningIndex = 0;
  const noteSections = groups.length
    ? groups
        .map(([category, rows]) => {
          const cards = rows
            .map(group => {
              const html = menuGroupCard(group, runningIndex, effectiveStatusById);
              runningIndex += 1;
              return html;
            })
            .join('');
          return `<section class="category-section">
            <div class="category-title"><h2>${esc(category)}</h2><span>${rows.length.toLocaleString('ko-KR')}개 메뉴</span></div>
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
  .round-list { display: grid; gap: 8px; padding: 9px 10px 10px; background: #fff; }
  .round-card { border: 1px solid #e5e7eb; border-radius: 5px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .round-head { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .round-head h3 { font-size: 11.5pt; }
  .note-index { color: #6b7280; font-size: 8.5pt; font-weight: 800; margin-bottom: 2px; }
  h3 { margin: 0; font-size: 13pt; letter-spacing: 0; }
  .note-head p, .round-head p { margin: 3px 0 0; color: #4b5563; font-size: 9pt; }
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
  .menu-photos { padding: 9px 11px 0; border-bottom: 1px solid #e5e7eb; }
  .menu-photos .photos { border-top: 0; padding: 5px 0 10px; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; padding: 10px 11px; border-top: 1px solid #e5e7eb; }
  figure { margin: 0; break-inside: avoid; }
  img { width: 100%; max-height: 190px; object-fit: contain; display: block; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; }
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
        <div class="meta">${esc(scopeLabel)} · 최신 차수 기준 메뉴별 상세 보고서</div>
      </div>
      <div class="meta" style="text-align:right">다운로드일 ${esc(printedDate)}<br>총 ${menuGroups.length.toLocaleString('ko-KR')}개 메뉴 · ${summary.total.toLocaleString('ko-KR')}개 차수</div>
    </header>
    <section class="summary-grid">
      <div class="summary-card"><span>노트 수</span><strong>${summary.total.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>메뉴 수</span><strong>${menuGroups.length.toLocaleString('ko-KR')}</strong></div>
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
