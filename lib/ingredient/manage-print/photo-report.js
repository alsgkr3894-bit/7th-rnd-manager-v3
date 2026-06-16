import { withDownloadDateSuffix } from '@/lib/download';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';
import { getIngredientPhoto } from '@/lib/ingredient/photos';
import {
  allergensLabel,
  esc,
  filterLabel,
  originLabel,
  priceLabel,
  rowName,
  scopeBadgeHtml,
  sourceLabel,
  text,
  unitLabel,
} from './formatters';

function photoSlotHtml(photo, label) {
  const img = photo?.data
    ? `<img src="${esc(photo.data)}" alt="${esc(label)}">`
    : `<div class="photo-empty"><span>${esc(label)}</span></div>`;
  return `<div class="photo-slot">${img}<div class="photo-label">${esc(label)}</div></div>`;
}

function infoRowHtml(key, value) {
  return `<div class="info-row"><span class="ik">${esc(key)}</span><span class="iv">${esc(value)}</span></div>`;
}

export function buildIngredientPhotoCard(row) {
  const packaging = getIngredientPhoto(row, 'packaging');
  const detail = getIngredientPhoto(row, 'detail');
  const tags = Array.isArray(row?.tags) ? row.tags.filter(Boolean).join(', ') : '';
  const statusStyle = row?.discontinued
    ? 'background:#fee2e2;color:#dc2626;'
    : row?.excluded
      ? 'background:#fef3c7;color:#92400e;'
      : 'display:none;';

  return `<div class="card">
  <div class="photos">
    ${photoSlotHtml(packaging, '포장사진')}
    ${photoSlotHtml(detail, '상세정보')}
  </div>
  <div class="info">
    <div class="item-name">
      ${esc(rowName(row))}<span class="source">${esc(sourceLabel(row))}</span>
      <span class="status-badge" style="${statusStyle}">${esc(row?.discontinued ? '단종' : '숨김')}</span>
    </div>
    <div style="margin-bottom:4px;">${scopeBadgeHtml(row?.scope)}</div>
    <div class="info-grid">
      ${infoRowHtml('코드', text(row?.productCode || (row?.isManual ? '자체' : '-')))}
      ${infoRowHtml('분류', text(row?.category, '미분류'))}
      ${infoRowHtml('단가', priceLabel(row))}
      ${infoRowHtml('포장단위', unitLabel(row))}
      ${infoRowHtml('원산지', originLabel(row))}
      ${infoRowHtml('알레르기', allergensLabel(row))}
      ${infoRowHtml('제조사', text(row?.manufacturer, '-'))}
      ${tags ? infoRowHtml('#태그', tags) : ''}
    </div>
  </div>
</div>`;
}

export function buildIngredientPhotoCardPages(rows = [], firstPageHeader = '') {
  return Array.from({ length: Math.ceil(rows.length / 2) }, (_, pageIndex) => {
    const pair = rows.slice(pageIndex * 2, pageIndex * 2 + 2);
    const breakClass = pageIndex > 0 ? ' break' : '';
    const header = pageIndex === 0 ? firstPageHeader : '';
    return `<div class="page${breakClass}">${header}${pair.map(buildIngredientPhotoCard).join('')}</div>`;
  }).join('');
}

const SCOPE_SORT_ORDER = { 전용: 0, 범용: 1, 범용관리: 2 };

export function sortIngredientPhotoRowsByScope(rows) {
  return [...rows].sort((a, b) => {
    const aOrder = SCOPE_SORT_ORDER[text(a?.scope, '')] ?? 3;
    const bOrder = SCOPE_SORT_ORDER[text(b?.scope, '')] ?? 3;
    return aOrder - bOrder;
  });
}

export function buildIngredientPhotoCardHtml(rows = [], options = {}) {
  const safeRows = sortIngredientPhotoRowsByScope(Array.isArray(rows) ? rows : []);
  const title = withDownloadDateSuffix(options.title || '식자재관리_사진');
  const generatedAt = new Date().toLocaleString('ko-KR', { hour12: false });
  const meta = [
    `출력 ${safeRows.length}개`,
    options.totalCount != null ? `전체 ${options.totalCount}개` : '',
    options.priceDate ? `제때 단가 ${options.priceDate}` : '',
    filterLabel(options.filters),
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');

  const firstPageHeader = `
    <div class="doc-header">
      <h1>식자재 관리 목록 (사진)</h1>
      <div class="stamp">생성 ${esc(generatedAt)}</div>
    </div>
    <div class="meta">${meta}</div>`;

  const body = safeRows.length
    ? buildIngredientPhotoCardPages(safeRows, firstPageHeader)
    : `<div class="page">${firstPageHeader}<div class="empty">출력할 식자재가 없습니다</div></div>`;

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
@page{size:A4 portrait;margin:0;}
body{font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#111;background:#fff;}
.page{width:210mm;height:297mm;padding:6mm;display:flex;flex-direction:column;gap:5px;overflow:hidden;}
.page.break{page-break-before:always;break-before:always;}
.doc-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:5px;border-bottom:2px solid #111;margin-bottom:3px;flex-shrink:0;}
h1{font-size:15px;font-weight:900;}
.stamp{font-size:9px;color:#666;}
.meta{font-size:10px;color:#555;flex-shrink:0;}
.card{flex:1;display:flex;flex-direction:column;border:1.5px solid #ccc;border-radius:6px;overflow:hidden;min-height:0;}
.photos{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:5px;background:#f5f5f5;min-height:0;}
.photo-slot{display:flex;flex-direction:column;gap:3px;min-height:0;}
.photo-slot img{flex:1;width:100%;object-fit:cover;border-radius:4px;display:block;min-height:0;}
.photo-empty{flex:1;background:#e4e4e4;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;min-height:0;}
.photo-label{font-size:9px;color:#888;font-weight:700;flex-shrink:0;text-align:center;}
.info{padding:7px 12px;display:flex;flex-direction:column;gap:4px;flex-shrink:0;}
.item-name{font-size:15px;font-weight:900;line-height:1.3;display:flex;align-items:baseline;flex-wrap:wrap;gap:5px;}
.source{font-size:8px;font-weight:700;border:1px solid #d8dee9;border-radius:999px;padding:1px 5px;color:#475569;}
.status-badge{font-size:8px;font-weight:700;border-radius:3px;padding:1px 6px;}
.scope-badge{display:inline-block;border-radius:3px;padding:1px 8px;font-size:11px;font-weight:800;}
.scope-jeonhyong{background:#dbeafe;color:#1d4ed8;}
.scope-beomyong{background:#dcfce7;color:#15803d;}
.scope-beomyong-manage{background:#f0fdf4;color:#166534;}
.scope-none{background:#f3f4f6;color:#9ca3af;}
.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:3px 12px;}
.info-row{display:flex;gap:4px;align-items:baseline;}
.ik{color:#999;white-space:nowrap;font-size:10px;flex-shrink:0;}
.iv{color:#111;font-weight:700;font-size:12px;line-height:1.3;word-break:keep-all;overflow-wrap:anywhere;}
.empty{padding:40px 0;text-align:center;color:#777;font-size:13px;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head>
<body>
${body}
${buildAutoPrintScript({ waitForImages: true })}
</body></html>`;
}

export function printIngredientPhotoReport(rows = [], options = {}) {
  return openPrintWindow(buildIngredientPhotoCardHtml(rows, options), {
    width: 860,
    height: 1060,
  });
}
