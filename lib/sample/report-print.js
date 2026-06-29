import { withDownloadDateSuffix } from '@/lib/download';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';
import { sampleNamesText } from './store';
import { sampleRoundLabel } from './rounds';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function textHtml(value) {
  return esc(value).replace(/\n/g, '<br>');
}

function validDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatSampleReportDownloadDate(date = new Date()) {
  const safeDate = validDate(date);
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}`;
}

function sampleTitle(sample) {
  return cleanText(sample?.title) || sampleNamesText(sample) || '제목 없음';
}

function sampleSortKey(sample) {
  return cleanText(sample?.testDate || sample?.updatedAt || sample?.createdAt);
}

function sortSamplesForReport(samples) {
  return [...(Array.isArray(samples) ? samples : [])].sort((a, b) =>
    sampleSortKey(b).localeCompare(sampleSortKey(a), 'ko')
  );
}

function countBy(samples, getter) {
  const counts = new Map();
  for (const sample of samples) {
    const label = cleanText(getter(sample)) || '미지정';
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
}

function groupByCategory(samples) {
  const groups = new Map();
  for (const sample of samples) {
    const category = cleanText(sample?.category) || '미지정';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(sample);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'));
}

export function buildSampleReportSummary(samples) {
  const safeSamples = Array.isArray(samples) ? samples : [];
  const titles = new Set(safeSamples.map(sampleTitle).filter(Boolean));
  const photoCount = safeSamples.reduce(
    (sum, sample) => sum + (Array.isArray(sample?.photos) ? sample.photos.length : 0),
    0
  );
  const ratedCount = safeSamples.filter(sample => Number(sample?.rating) > 0).length;

  return {
    total: safeSamples.length,
    titleCount: titles.size,
    photoCount,
    ratedCount,
    categoryCounts: countBy(safeSamples, sample => sample?.category),
    ratingCounts: countBy(safeSamples, sample =>
      Number(sample?.rating) > 0 ? `${Math.round(Number(sample.rating))}점` : '미평가'
    ),
    companyCounts: countBy(safeSamples, sample => sample?.company),
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

function metaLine(sample) {
  return [
    cleanText(sample?.testDate) ? `테스트일 ${cleanText(sample.testDate)}` : '',
    sampleRoundLabel(sample),
    cleanText(sample?.category) ? `구분 ${cleanText(sample.category)}` : '',
    cleanText(sample?.company) ? `업체 ${cleanText(sample.company)}` : '',
    cleanText(sample?.tester) ? `작성 ${cleanText(sample.tester)}` : '',
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
}

function ratingHtml(rating) {
  const score = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  if (!score) return '<span class="muted">미평가</span>';
  return `<span class="stars">${'★'.repeat(score)}${'☆'.repeat(5 - score)}</span><span class="muted"> ${score}/5</span>`;
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

function photoGrid(sample) {
  const photos = (Array.isArray(sample?.photos) ? sample.photos : []).filter(photo => photo?.data);
  if (!photos.length) return '';
  return `<div class="photos">${photos
    .map(
      photo => `<figure>
        <img src="${esc(photo.data)}" alt="${esc(photo.caption || photo.name || '샘플 사진')}">
        ${photo.caption || photo.name ? `<figcaption>${esc(photo.caption || photo.name)}</figcaption>` : ''}
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

function linkedProducts(sample) {
  const rows = Array.isArray(sample?.linkedProducts) ? sample.linkedProducts : [];
  const items = rows
    .map(item => cleanText(item?.name || item?.ingredientName || item?.productCode || item?.code))
    .filter(Boolean);
  return items.join(', ');
}

function sampleCard(sample, index) {
  const names = sampleNamesText(sample);
  const linked = linkedProducts(sample);
  const priceText = cleanText(sample?.price)
    ? `${cleanText(sample.price)}${sample?.priceTaxType === 'excl' ? ' (부가세 별도)' : ' (부가세 포함)'}`
    : '';

  return `<article class="sample-card">
    <header class="sample-head">
      <div>
        <div class="sample-index">No. ${index + 1}</div>
        <h3>${esc(sampleTitle(sample))}</h3>
        <p>${metaLine(sample) || '기본 정보 없음'}</p>
      </div>
      <div class="score">${ratingHtml(sample?.rating)}</div>
    </header>
    <section class="sample-summary">
      <div><span>샘플명</span><strong>${esc(names || '-')}</strong></div>
      <div><span>가격</span><strong>${esc(priceText || '-')}</strong></div>
    </section>
    ${fieldGrid([
      ['설명', sample?.description],
      ['결과', sample?.result],
      ['개선점', sample?.improvements],
      ['다음 액션', sample?.nextAction],
      ['연결 품목', linked],
    ])}
    ${photoGrid(sample)}
    ${tagList(sample?.tags)}
  </article>`;
}

export function buildSampleRecordsReportHtml(samples, options = {}) {
  const safeSamples = sortSamplesForReport(samples);
  const now = validDate(options.now);
  const title = cleanText(options.title) || '샘플기록 PDF 보고서';
  const scopeLabel = cleanText(options.scopeLabel) || '현재 목록 전체';
  const printedDate = formatSampleReportDownloadDate(now);
  const documentTitle = withDownloadDateSuffix(title, now);
  const summary = buildSampleReportSummary(safeSamples);
  const groups = groupByCategory(safeSamples);
  let runningIndex = 0;
  const sampleSections = groups.length
    ? groups
        .map(([category, rows]) => {
          const cards = rows
            .map(sample => {
              const html = sampleCard(sample, runningIndex);
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
    : '<section class="empty-report">출력할 샘플기록이 없습니다.</section>';

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
  .meta, .muted { color: #6b7280; }
  .meta { font-size: 9.5pt; line-height: 1.6; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin: 12px 0; }
  .summary-card { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 9px; }
  .summary-card span { display: block; color: #6b7280; font-size: 8.5pt; margin-bottom: 3px; }
  .summary-card strong { font-size: 13pt; }
  .count-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 12px 0 16px; }
  .count-box { border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
  .count-box h2 { margin: 0; background: #f3f4f6; padding: 7px 9px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-top: 1px solid #e5e7eb; padding: 5px 7px; text-align: left; vertical-align: top; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .category-section + .category-section { break-before: page; page-break-before: always; }
  .category-title { margin: 14px 0 8px; padding: 8px 10px; border: 1px solid #111827; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; break-after: avoid; page-break-after: avoid; }
  .category-title h2 { margin: 0; font-size: 14pt; }
  .category-title span { color: #4b5563; font-size: 9pt; font-weight: 800; }
  .sample-card { border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 10px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .sample-head { display: flex; justify-content: space-between; gap: 12px; padding: 9px 11px; background: #f3f4f6; border-bottom: 1px solid #d1d5db; }
  .sample-index { color: #6b7280; font-size: 8.5pt; font-weight: 800; margin-bottom: 2px; }
  h3 { margin: 0; font-size: 13pt; letter-spacing: 0; }
  .sample-head p { margin: 3px 0 0; color: #4b5563; font-size: 9pt; }
  .score { text-align: right; min-width: 92px; }
  .stars { color: #f59e0b; letter-spacing: 0; white-space: nowrap; }
  .sample-summary { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #e5e7eb; }
  .sample-summary > div { padding: 8px 11px; }
  .sample-summary > div:first-child { border-right: 1px solid #e5e7eb; }
  .sample-summary span { display: block; color: #6b7280; font-size: 8.5pt; margin-bottom: 2px; }
  .sample-summary strong { font-size: 10pt; overflow-wrap: anywhere; }
  h4 { margin: 0 0 4px; color: #374151; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .field { padding: 8px 11px; border-top: 1px solid #e5e7eb; }
  .field:nth-child(odd) { border-right: 1px solid #e5e7eb; }
  .field div { line-height: 1.55; overflow-wrap: anywhere; }
  .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; padding: 10px 11px; border-top: 1px solid #e5e7eb; }
  figure { margin: 0; break-inside: avoid; }
  img { width: 100%; max-height: 260px; object-fit: contain; display: block; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; }
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
        <div class="meta">${esc(scopeLabel)} · 카테고리별 샘플 상세 보고서</div>
      </div>
      <div class="meta" style="text-align:right">다운로드일 ${esc(printedDate)}<br>총 ${summary.total.toLocaleString('ko-KR')}건</div>
    </header>
    <section class="summary-grid">
      <div class="summary-card"><span>샘플 수</span><strong>${summary.total.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>제목 수</span><strong>${summary.titleCount.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>사진 수</span><strong>${summary.photoCount.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>평가 완료</span><strong>${summary.ratedCount.toLocaleString('ko-KR')}</strong></div>
    </section>
    <section class="count-grid">
      ${countTable('카테고리별 현황', summary.categoryCounts)}
      ${countTable('별점별 현황', summary.ratingCounts)}
      ${countTable('업체별 현황', summary.companyCounts)}
    </section>
    ${sampleSections}
    <footer class="footer">7번가피자 R&amp;D 플랫폼 · 샘플기록 PDF 보고서 · ${esc(printedDate)} 출력</footer>
  </main>
  ${buildAutoPrintScript({ waitForImages: true })}
</body>
</html>`;
}

export function printSampleRecordsReport(samples, options = {}) {
  return openPrintWindow(buildSampleRecordsReportHtml(samples, options), {
    width: 980,
    height: 1000,
  });
}
