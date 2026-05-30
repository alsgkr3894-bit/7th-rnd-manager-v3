/**
 * lib/nutrition/origin/export.js
 * 원산지 → 엑셀 출력 (셀병합 없이 템플릿 칼럼 구조 그대로)
 *
 * 시트1 원산지정보   : A=구분 | B=음식명 | C=재료명(원산지)
 * 시트2 원산지표지판 : A=표시품목 | B=원산지 | C=메뉴명
 * 시트3 냉장고부착용 : A=음식명 | B=표시품목 | C=원산지
 */
import { loadXlsx } from '@/lib/excel';

let XLSX; // resolved lazily in exportOriginToExcel

const ORIGIN_DISCLAIMER = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';

/* ── 유틸 ────────────────────────────────────────────────────── */

function makeCell(value) { return { v: value ?? '', t: 's' }; }

function writeCell(ws, row, col, value) {
  ws[XLSX.utils.encode_cell({ r: row, c: col })] = makeCell(value);
}

function getSubCat(row) {
  if (row.menuCode) {
    const p = row.menuCode.toUpperCase().split('-');
    const map = { PS: '프리미엄 스페셜', PR: '프리미엄', OR: '오리지널', HH: '하프앤하프', ONE: '1인피자' };
    if (map[p[1]]) return map[p[1]];
  }
  return row.subCategory || row.category || '기타';
}

function toIngText(row) {
  const items = row.items?.length
    ? row.items
    : [{ displayName: row.displayName, originCountry: row.originCountry }];
  const inner = items
    .filter(it => it.displayName || it.originCountry)
    .map(it => [it.displayName, it.originCountry].filter(Boolean).join(':'))
    .join(', ');
  const name = row.ingredientName || '';
  return name ? `${name}(${inner})` : inner;
}

/** fromRow~toRow 행 셀 전체 삭제 (1-based) */
function deleteRows(ws, fromRow, toRow) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:D100');
  for (let r = fromRow - 1; r <= toRow - 1; r++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      delete ws[XLSX.utils.encode_cell({ r, c: col })];
    }
  }
}

/* ── 시트1: 원산지정보 ───────────────────────────────────────── */
function fillSheet1(ws, origins) {
  const menuMap = new Map();
  for (const row of origins) {
    const links = row.menuCodes?.length
      ? row.menuCodes
      : [{ menuCode: row.menuCode || '', menuName: row.menuName || row.ingredientName || '' }];
    for (const { menuCode, menuName } of links) {
      const displayName = menuName || row.ingredientName || menuCode || '';
      const key = `${displayName}||${row.ingredientId ?? row.ingredientName ?? ''}`;
      if (!menuMap.has(key)) menuMap.set(key, { subCat: getSubCat({ ...row, menuCode }), menuName: displayName, parts: [] });
      const entry = menuMap.get(key);
      const ingText = toIngText(row);
      if (!entry.parts.includes(ingText)) entry.parts.push(ingText);
    }
  }

  const subOrder = ['프리미엄 스페셜', '프리미엄', '오리지널', '하프앤하프', '1인피자', '사이드', '기타'];
  const menuRows = [...menuMap.values()].sort((a, b) => {
    const ia = subOrder.indexOf(a.subCat), ib = subOrder.indexOf(b.subCat);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const groups = [];
  let cur = null;
  for (const r of menuRows) {
    if (!cur || cur.subCat !== r.subCat) { cur = { subCat: r.subCat, rows: [] }; groups.push(cur); }
    cur.rows.push(r);
  }

  deleteRows(ws, 6, 200);
  ws['!merges'] = (ws['!merges'] || []).filter(m => m.e.r < 5);

  let rowIdx = 5; // 0-based, 행6부터
  for (const g of groups) {
    for (let i = 0; i < g.rows.length; i++) {
      const row = g.rows[i];
      writeCell(ws, rowIdx, 0, i === 0 ? g.subCat : '');
      writeCell(ws, rowIdx, 1, row.menuName);
      writeCell(ws, rowIdx, 2, row.parts.join(', '));
      rowIdx++;
    }
  }

  rowIdx++;
  writeCell(ws, rowIdx, 0, ORIGIN_DISCLAIMER);
  ws['D3'] = makeCell(new Date().toISOString().slice(0, 7).replace('-', '.'));
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx, c: 3 } });
}

/* ── 시트2: 원산지표지판 ─────────────────────────────────────── */
function fillSheet2(ws, origins) {
  const itemMap = new Map();
  for (const row of origins) {
    const menuNames = row.menuCodes?.length
      ? row.menuCodes.map(m => m.menuName || m.menuCode).filter(Boolean)
      : [(row.menuName || row.ingredientName || '')].filter(Boolean);
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry }];
    for (const it of items) {
      if (!it.displayName && !it.originCountry) continue;
      const key = `${it.displayName || ''}||${it.originCountry || ''}`;
      if (!itemMap.has(key)) {
        itemMap.set(key, { displayName: it.displayName || '', originCountry: it.originCountry || '', menus: new Set() });
      }
      for (const mn of menuNames) itemMap.get(key).menus.add(mn);
    }
  }

  deleteRows(ws, 1, 200);
  ws['!merges'] = [];

  writeCell(ws, 0, 0, '원산지표시판');
  writeCell(ws, 1, 0, '표시품목');
  writeCell(ws, 1, 1, '원산지');
  writeCell(ws, 1, 2, '메뉴명');

  let rowIdx = 2;
  for (const { displayName, originCountry, menus } of itemMap.values()) {
    writeCell(ws, rowIdx, 0, displayName);
    writeCell(ws, rowIdx, 1, originCountry);
    writeCell(ws, rowIdx, 2, [...menus].join(', '));
    rowIdx++;
  }

  rowIdx++;
  writeCell(ws, rowIdx, 0, ORIGIN_DISCLAIMER);
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx, c: 2 } });
}

/* ── 시트3: 냉장고부착용 ─────────────────────────────────────── */
function fillSheet3(ws, origins) {
  deleteRows(ws, 1, 200);
  ws['!merges'] = [];

  writeCell(ws, 0, 0, '원산지표시판 (냉장고부착용)');
  writeCell(ws, 1, 0, '음식명');
  writeCell(ws, 1, 1, '표시품목');
  writeCell(ws, 1, 2, '원산지');

  let rowIdx = 2;
  for (const row of origins) {
    const menuName = row.menuCodes?.length
      ? row.menuCodes.map(m => m.menuName || m.menuCode).filter(Boolean).join(', ')
      : (row.menuName || row.ingredientName || '');
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry }];
    const valid = items.filter(it => it.displayName || it.originCountry);
    if (!valid.length) continue;

    writeCell(ws, rowIdx, 0, menuName);
    writeCell(ws, rowIdx, 1, valid.map(it => it.displayName).filter(Boolean).join(', '));
    writeCell(ws, rowIdx, 2, valid.map(it => [it.displayName, it.originCountry].filter(Boolean).join(':')).join('/'));
    rowIdx++;
  }

  rowIdx++;
  writeCell(ws, rowIdx, 0, ORIGIN_DISCLAIMER);
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx, c: 2 } });
}

/* ── 메인 export ─────────────────────────────────────────────── */
export async function exportOriginToExcel(origins, filename = '원산지표시판') {
  XLSX = await loadXlsx();
  const res = await fetch('/templates/원산지_템플릿.xlsx');
  if (!res.ok) throw new Error('템플릿 파일을 불러올 수 없습니다');
  const ab = await res.arrayBuffer();

  const wb = XLSX.read(ab, { type: 'array', cellStyles: true, cellDates: true });
  const [sh1, sh2, sh3] = wb.SheetNames;

  fillSheet1(wb.Sheets[sh1], origins);
  fillSheet2(wb.Sheets[sh2], origins);
  fillSheet3(wb.Sheets[sh3], origins);

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}
