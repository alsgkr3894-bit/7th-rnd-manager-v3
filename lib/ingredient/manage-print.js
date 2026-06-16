/**
 * lib/ingredient/manage-print.js — 식자재관리 PDF/인쇄 출력
 *
 * 앱 전역 CSS와 분리된 자체 HTML을 새 창에 그린 뒤 브라우저 PDF 저장 흐름을 사용한다.
 */

import { formatNumber } from '@/lib/format';
import { withDownloadDateSuffix } from '@/lib/download';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';
import { DISCONTINUED_FILTER, SCOPE_UNASSIGNED, UNCATEGORIZED_FILTER } from './constants';

const esc = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function text(value, fallback = '') {
  const s = String(value ?? '').trim();
  return s || fallback;
}

function rowName(row) {
  return text(row?.ingredientName || row?.displayName || row?.productName, '-');
}

function unitLabel(row) {
  const baseQuantity = Number(row?.baseQuantity);
  const baseUnitType = text(row?.baseUnitType);
  if (Number.isFinite(baseQuantity) && baseQuantity > 0 && baseUnitType) {
    return `${formatNumber(baseQuantity)}${baseUnitType}`;
  }
  return text(row?.salesUnit, '-');
}

function priceLabel(row) {
  const price = Number(row?.priceWithTax ?? row?.priceOverride ?? row?.price);
  return Number.isFinite(price) ? `${formatNumber(price)}원` : '-';
}

function originLabel(row) {
  const origin = Array.isArray(row?.origin) ? row.origin : [];
  const values = origin
    .map(item => {
      const displayName = text(item?.displayName);
      const country = text(item?.country);
      if (!country) return '';
      return displayName ? `${displayName} ${country}` : country;
    })
    .filter(Boolean);
  return values.length ? values.join(', ') : '-';
}

function allergensLabel(row) {
  const allergens = Array.isArray(row?.allergens) ? row.allergens.map(item => text(item)) : [];
  const values = allergens.filter(Boolean);
  return values.length ? values.join(', ') : '-';
}

function filterLabel(filters = {}) {
  const parts = [];
  const category = text(filters.category, 'all');
  const tag = text(filters.tag, 'all');
  const search = text(filters.search);

  if (category === DISCONTINUED_FILTER) parts.push('분류: 단종');
  else if (category === UNCATEGORIZED_FILTER) parts.push('분류: 미분류');
  else if (category && category !== 'all') parts.push(`분류: ${category}`);
  else parts.push('분류: 전체');

  if (tag && tag !== 'all') parts.push(`#${tag}`);
  if (search) parts.push(`검색: ${search}`);
  return parts.join(' · ');
}

function sourceLabel(row) {
  if (row?.jetteLinked) return '제때연동';
  if (row?.isSeeded) return '시드';
  return row?.isManual ? '수동' : '수동';
}

function buildRows(rows = []) {
  return rows
    .map((row, index) => {
      const tags = Array.isArray(row?.tags) ? row.tags.filter(Boolean).join(', ') : '';
      const status = row?.discontinued ? '단종' : row?.excluded ? '숨김' : '사용';
      const scope = text(row?.scope, SCOPE_UNASSIGNED);
      return `<tr>
  <td class="num">${index + 1}</td>
  <td class="code">${esc(row?.productCode || (row?.isManual ? '자체' : '-'))}</td>
  <td class="name">${esc(rowName(row))}<span class="source">${esc(sourceLabel(row))}</span></td>
  <td>${esc(text(row?.category, '미분류'))}</td>
  <td>${esc(scope)}</td>
  <td>${esc(unitLabel(row))}</td>
  <td class="right">${esc(priceLabel(row))}</td>
  <td>${esc(originLabel(row))}</td>
  <td>${esc(allergensLabel(row))}</td>
  <td>${esc(text(row?.manufacturer, '-'))}</td>
  <td>${esc(tags || '-')}</td>
  <td>${esc(status)}</td>
</tr>`;
    })
    .join('');
}

export function buildIngredientManagePrintHtml(rows = [], options = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const title = withDownloadDateSuffix(options.title || '식자재관리');
  const generatedAt = new Date().toLocaleString('ko-KR', { hour12: false });
  const meta = [
    `출력 ${safeRows.length}개`,
    options.totalCount != null ? `전체 ${options.totalCount}개` : '',
    options.managedCount != null ? `관리 중 ${options.managedCount}개` : '',
    options.priceDate ? `제때 단가 ${options.priceDate}` : '',
    filterLabel(options.filters),
  ].filter(Boolean);

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
*{box-sizing:border-box;}
@page{size:A4 landscape;margin:10mm;}
body{margin:0;padding:10mm;font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#111;background:#fff;}
.header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:12px;border-bottom:2px solid #111;padding-bottom:8px;}
h1{font-size:18px;margin:0;font-weight:900;}
.stamp{font-size:10px;color:#666;white-space:nowrap;}
.meta{font-size:11px;color:#555;margin-bottom:10px;line-height:1.5;}
table{width:100%;border-collapse:collapse;font-size:9px;table-layout:fixed;}
th,td{border:1px solid #ddd;padding:4px 5px;vertical-align:top;word-break:keep-all;overflow-wrap:anywhere;}
th{background:#f3f4f6;font-weight:800;text-align:center;color:#333;}
.num{width:28px;text-align:center;}
.code{width:74px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#555;}
.name{width:150px;font-weight:700;}
.right{text-align:right;white-space:nowrap;}
.source{display:inline-block;margin-left:4px;border:1px solid #d8dee9;border-radius:999px;padding:0 5px;font-size:8px;font-weight:800;color:#475569;white-space:nowrap;}
.empty{padding:28px 0;text-align:center;color:#777;border:1px dashed #ddd;font-size:12px;}
@media print{body{padding:0;}th{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head>
<body>
  <div class="header">
    <h1>식자재 관리 목록</h1>
    <div class="stamp">생성 ${esc(generatedAt)}</div>
  </div>
  <div class="meta">${meta.map(esc).join(' · ')}</div>
  ${
    safeRows.length
      ? `<table>
    <thead>
      <tr>
        <th class="num">No</th>
        <th class="code">제품코드</th>
        <th class="name">식자재명</th>
        <th>분류</th>
        <th>전용/범용</th>
        <th>포장단위</th>
        <th>단가</th>
        <th>원산지</th>
        <th>알레르기</th>
        <th>제조사</th>
        <th>#태그</th>
        <th>상태</th>
      </tr>
    </thead>
    <tbody>${buildRows(safeRows)}</tbody>
  </table>`
      : '<div class="empty">출력할 식자재가 없습니다</div>'
  }
  ${buildAutoPrintScript()}
</body></html>`;
}

export function printIngredientManageReport(rows = [], options = {}) {
  return openPrintWindow(buildIngredientManagePrintHtml(rows, options), {
    width: 1100,
    height: 760,
  });
}
