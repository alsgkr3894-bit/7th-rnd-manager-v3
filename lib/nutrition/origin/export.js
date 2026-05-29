/**
 * lib/nutrition/origin/export.js
 * 원산지 → 엑셀 출력 (셀병합 없이 템플릿 칼럼 구조 그대로)
 *
 * 시트1 원산지정보   : A=구분 | B=음식명 | C=재료명(원산지)
 * 시트2 원산지표지판 : A=표시품목 | B=원산지 | C=메뉴명
 * 시트3 냉장고부착용 : A=음식명 | B=표시품목 | C=원산지
 */
import * as XLSX from 'xlsx';

/* ── 유틸 ────────────────────────────────────────────────────── */
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

function c(v) { return { v: v ?? '', t: 's' }; }

function set(ws, r, col, v) {
  ws[XLSX.utils.encode_cell({ r, c: col })] = c(v);
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
      // 표시용 이름: menuName 우선, 없으면 ingredientName (menuCode는 내부 코드라 출력 안 함)
      const displayName = menuName || row.ingredientName || menuCode || '';
      // 같은 (displayName, row) 조합이 중복 추가되지 않도록 row별로 추적
      const key = `${displayName}||${row.ingredientId ?? row.ingredientName ?? ''}`;
      if (!menuMap.has(key)) menuMap.set(key, { subCat: getSubCat({ ...row, menuCode }), menuName: displayName, parts: [] });
      // 같은 row에서 이미 같은 menuMap 엔트리에 parts를 추가한 경우 스킵
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

  // 데이터 영역(행6~) 삭제, 헤더 병합(행1~5)만 유지
  deleteRows(ws, 6, 200);
  ws['!merges'] = (ws['!merges'] || []).filter(m => m.e.r < 5);

  let rowIdx = 5; // 0-based, 행6부터
  for (const g of groups) {
    for (let i = 0; i < g.rows.length; i++) {
      const r = g.rows[i];
      set(ws, rowIdx, 0, i === 0 ? g.subCat : '');
      set(ws, rowIdx, 1, r.menuName);
      set(ws, rowIdx, 2, r.parts.join(', '));
      rowIdx++;
    }
  }

  // 빈 행 + 주의문구
  rowIdx++;
  set(ws, rowIdx, 0, '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.');

  // 날짜 업데이트 (D3)
  ws['D3'] = c(new Date().toISOString().slice(0, 7).replace('-', '.'));

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx, c: 3 } });
}

/* ── 시트2: 원산지표지판 ─────────────────────────────────────── */
function fillSheet2(ws, origins) {
  // 표시품목+원산지 기준으로 메뉴 모아두기
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

  // 시트 전체 초기화 후 새로 작성 (병합 없음)
  deleteRows(ws, 1, 200);
  ws['!merges'] = [];

  // 행1: 제목
  set(ws, 0, 0, '원산지표시판');

  // 행2: 컬럼 헤더
  set(ws, 1, 0, '표시품목');
  set(ws, 1, 1, '원산지');
  set(ws, 1, 2, '메뉴명');

  // 행3~: 데이터
  let r = 2;
  for (const { displayName, originCountry, menus } of itemMap.values()) {
    set(ws, r, 0, displayName);
    set(ws, r, 1, originCountry);
    set(ws, r, 2, [...menus].join(', '));
    r++;
  }

  r++;
  set(ws, r, 0, '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.');

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 2 } });
}

/* ── 시트3: 냉장고부착용 ─────────────────────────────────────── */
function fillSheet3(ws, origins) {
  deleteRows(ws, 1, 200);
  ws['!merges'] = [];

  // 행1: 제목
  set(ws, 0, 0, '원산지표시판 (냉장고부착용)');

  // 행2: 컬럼 헤더
  set(ws, 1, 0, '음식명');
  set(ws, 1, 1, '표시품목');
  set(ws, 1, 2, '원산지');

  // 행3~: 데이터
  let r = 2;
  for (const row of origins) {
    const menuName = row.menuCodes?.length
      ? row.menuCodes.map(m => m.menuName || m.menuCode).filter(Boolean).join(', ')
      : (row.menuName || row.ingredientName || '');
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry }];
    const valid = items.filter(it => it.displayName || it.originCountry);
    if (!valid.length) continue;

    set(ws, r, 0, menuName);
    set(ws, r, 1, valid.map(it => it.displayName).filter(Boolean).join(', '));
    set(ws, r, 2, valid.map(it => [it.displayName, it.originCountry].filter(Boolean).join(':')).join('/'));
    r++;
  }

  r++;
  set(ws, r, 0, '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.');

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 2 } });
}

/* ── 메인 export ─────────────────────────────────────────────── */
export async function exportOriginToExcel(origins, filename = '원산지표시판') {
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
