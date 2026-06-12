import { normalizeIngredientPhotos, INGREDIENT_PHOTO_SLOTS } from '@/lib/ingredient';
import { formatUnitPrice } from '@/lib/format';
import { openPrintWindow } from '@/lib/print/window-print';
import { withDownloadDateSuffix } from '@/lib/download';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';

export const ALLERGEN_MAP = Object.fromEntries(
  ALLERGEN_SEED.map(a => [a.allergenCode, a.allergenName])
);

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function ingredientName(row) {
  return row.ingredientName || row.displayName || row.productName || '';
}

export function originText(row) {
  return (row.origin || [])
    .map(o => [o.displayName, o.country].filter(Boolean).join(':'))
    .filter(Boolean)
    .join(', ');
}

export function allergenText(row) {
  return (row.allergens || []).map(c => ALLERGEN_MAP[c] || c).join(', ');
}

export function printIngredientPdf(rows, { includePhotos = true } = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const title = withDownloadDateSuffix('식자재 리스트');
  const cardBody = safeRows
    .map(row => {
      const photos = normalizeIngredientPhotos(row.photos, row.photo);
      const photoBoxes = INGREDIENT_PHOTO_SLOTS.map(slot => {
        const photo = photos[slot.key];
        return `<div class="photo-box">
          <div class="photo-label">${esc(slot.shortLabel)}</div>
          <div class="photo-frame">
            ${
              photo
                ? `<img src="${esc(photo.data)}" alt="${esc(photo.name || `${ingredientName(row)} ${slot.label}`)}">`
                : '<span>사진 없음</span>'
            }
          </div>
        </div>`;
      }).join('');
      const unit = row.baseUnitType || row.salesUnit || 'g';
      return `
        <article class="ing-card">
          ${includePhotos ? `<div class="photo-grid">${photoBoxes}</div>` : ''}
          <div class="ing-info">
            <div class="name">${esc(ingredientName(row))}</div>
            <div class="code">${esc(row.productCode || '자체/수동')}</div>
            <dl>
              <dt>분류</dt><dd>${esc(row.category || '-')}</dd>
              <dt>단위</dt><dd>${esc(row.baseUnitType || row.salesUnit || '-')}</dd>
              <dt>단가</dt><dd>${esc(formatUnitPrice(row.unitPrice, unit) || '-')}</dd>
              <dt>거래처</dt><dd>${esc(row.manufacturer || '-')}</dd>
              <dt>원산지</dt><dd>${esc(originText(row) || '-')}</dd>
              <dt>알레르기</dt><dd>${esc(allergenText(row) || '-')}</dd>
            </dl>
          </div>
        </article>`;
    })
    .join('');
  const tableBody = safeRows
    .map(
      row => `
        <tr>
          <td>${esc(row.productCode || '-')}</td>
          <td class="name-cell">${esc(ingredientName(row))}</td>
          <td>${esc(row.category || '-')}</td>
          <td>${esc(row.baseUnitType || row.salesUnit || '-')}</td>
          <td class="right">${esc(formatUnitPrice(row.unitPrice, row.baseUnitType || row.salesUnit || 'g') || '-')}</td>
          <td>${esc(row.manufacturer || '-')}</td>
          <td>${esc(allergenText(row) || '-')}</td>
        </tr>`
    )
    .join('');
  const body = includePhotos
    ? `<section class="card-grid">${cardBody}</section>`
    : `<table><thead><tr><th>코드</th><th>식자재명</th><th>분류</th><th>단위</th><th>단가</th><th>거래처</th><th>알레르기</th></tr></thead><tbody>${tableBody}</tbody></table>`;
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 18mm; font-family: Pretendard, -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; background: #fff; }
.doc-head { display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
.doc-title { font-size: 24px; font-weight: 900; letter-spacing: 0; }
.doc-meta { font-size: 11px; color: #4B5563; font-weight: 700; }
.card-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.ing-card { display: grid; grid-template-columns: 1fr; gap: 10px; border: 1px solid #D1D5DB; border-radius: 8px; padding: 10px; break-inside: avoid; page-break-inside: avoid; }
.photo-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; align-items: stretch; }
.photo-box { min-height: 176px; border: 1px solid #D1D5DB; border-radius: 6px; background: #F3F4F6; display: flex; flex-direction: column; gap: 6px; padding: 7px; overflow: visible; color: #9CA3AF; font-size: 12px; font-weight: 700; break-inside: avoid; page-break-inside: avoid; }
.photo-label { align-self: flex-start; padding: 2px 6px; border-radius: 999px; background: rgba(17, 24, 39, .72); color: #fff; font-size: 9px; font-weight: 900; line-height: 1.2; }
.photo-frame { flex: 1 1 auto; min-height: 138px; display: flex; align-items: center; justify-content: center; overflow: visible; }
.photo-frame span { color: #9CA3AF; }
.photo-frame img { width: auto; height: auto; max-width: 100%; max-height: 138px; object-fit: contain; object-position: center; display: block; image-orientation: from-image; }
.name { font-size: 15px; font-weight: 900; line-height: 1.35; margin-bottom: 2px; }
.code { font-size: 10px; color: #6B7280; font-weight: 800; margin-bottom: 8px; }
dl { display: grid; grid-template-columns: 54px 1fr; gap: 4px 8px; margin: 0; font-size: 11px; line-height: 1.4; }
dt { color: #6B7280; font-weight: 800; }
dd { margin: 0; color: #111827; word-break: keep-all; overflow-wrap: anywhere; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #D1D5DB; padding: 7px 8px; font-size: 11px; line-height: 1.45; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
th { background: #F3F4F6; font-weight: 900; text-align: center; }
.name-cell { font-weight: 800; }
.right { text-align: right; }
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .photo-box, .photo-frame, .photo-frame img { break-inside: avoid; page-break-inside: avoid; }
}
</style></head><body>
<header class="doc-head"><div class="doc-title">${esc(title)}</div><div class="doc-meta">${safeRows.length}개 · ${includePhotos ? '사진 포함' : '사진 미포함'}</div></header>
${body}
<script>
window.onload = function() {
  var images = Array.prototype.slice.call(document.images || []);
  var waits = images.map(function(img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function(resolve) {
      img.onload = resolve;
      img.onerror = resolve;
    });
  });
  Promise.all(waits).then(function() {
    requestAnimationFrame(function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 120);
    });
  });
};
window.onafterprint = function() { window.close(); };
<\/script>
</body></html>`;
  openPrintWindow(html, { width: 1100, height: 900 });
}
