import { withDownloadDateSuffix } from '@/lib/download';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';
import { getPrimaryIngredientPhoto } from '@/lib/ingredient/photos';
import { SCOPE_UNASSIGNED } from '../constants';
import {
  allergensLabel,
  esc,
  filterLabel,
  originLabel,
  priceLabel,
  rowName,
  sourceLabel,
  text,
  unitLabel,
} from './formatters';

function nameCellHtml(row, includePhotos) {
  const nameText = `${esc(rowName(row))}<span class="source">${esc(sourceLabel(row))}</span>`;
  if (!includePhotos) return nameText;
  const photo = getPrimaryIngredientPhoto(row);
  const imgHtml = photo?.data
    ? `<img src="${esc(photo.data)}" alt="" class="photo-thumb">`
    : `<span class="photo-empty"></span>`;
  return `<div class="name-with-photo">${imgHtml}<span>${nameText}</span></div>`;
}

export function buildIngredientManageTableRows(rows = [], { includePhotos = false } = {}) {
  return rows
    .map((row, index) => {
      const tags = Array.isArray(row?.tags) ? row.tags.filter(Boolean).join(', ') : '';
      const status = row?.discontinued ? '단종' : row?.excluded ? '숨김' : '사용';
      const scope = text(row?.scope, SCOPE_UNASSIGNED);
      return `<tr>
  <td class="num">${index + 1}</td>
  <td class="code">${esc(row?.productCode || (row?.isManual ? '자체' : '-'))}</td>
  <td class="name">${nameCellHtml(row, includePhotos)}</td>
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

export function buildIngredientManagePrintMeta(rows, options = {}) {
  return [
    `출력 ${rows.length}개`,
    options.totalCount != null ? `전체 ${options.totalCount}개` : '',
    options.managedCount != null ? `관리 중 ${options.managedCount}개` : '',
    options.priceDate ? `제때 단가 ${options.priceDate}` : '',
    filterLabel(options.filters),
  ].filter(Boolean);
}

export function buildIngredientManagePrintHtml(rows = [], options = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const { includePhotos = false } = options;
  const title = withDownloadDateSuffix(options.title || '식자재관리');
  const generatedAt = new Date().toLocaleString('ko-KR', { hour12: false });
  const meta = buildIngredientManagePrintMeta(safeRows, options);
  const nameColWidth = includePhotos ? '200px' : '150px';

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
.name{width:${nameColWidth};font-weight:700;}
.right{text-align:right;white-space:nowrap;}
.source{display:inline-block;margin-left:4px;border:1px solid #d8dee9;border-radius:999px;padding:0 5px;font-size:8px;font-weight:800;color:#475569;white-space:nowrap;}
.name-with-photo{display:flex;align-items:flex-start;gap:5px;}
.name-with-photo span{flex:1;}
.photo-thumb{width:44px;height:44px;object-fit:cover;border-radius:3px;flex-shrink:0;}
.photo-empty{width:44px;height:44px;background:#f3f4f6;border-radius:3px;flex-shrink:0;display:inline-block;}
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
    <tbody>${buildIngredientManageTableRows(safeRows, { includePhotos })}</tbody>
  </table>`
      : '<div class="empty">출력할 식자재가 없습니다</div>'
  }
  ${buildAutoPrintScript({ waitForImages: includePhotos })}
</body></html>`;
}

export function printIngredientManageReport(rows = [], options = {}) {
  return openPrintWindow(buildIngredientManagePrintHtml(rows, options), {
    width: 1100,
    height: 760,
  });
}
