/**
 * lib/nutrition/origin/export.js
 * 원산지 → 엑셀 출력
 * 방식: 원본 B타입 템플릿을 읽어 데이터 행만 교체 → 서식 100% 보존
 */
import * as XLSX from 'xlsx';

/* ── 유틸 ────────────────────────────────────────────────────── */
/** 중분류 추출 */
function getSubCat(row) {
  if (row.menuCode) {
    const p = row.menuCode.toUpperCase().split('-');
    const map = { PS: '프리미엄 스페셜', PR: '프리미엄', OR: '오리지널', HH: '하프앤하프', ONE: '1인피자' };
    if (map[p[1]]) return map[p[1]];
  }
  return row.subCategory || row.category || '기타';
}

/** 재료명(표시품목:원산지) 텍스트 생성 */
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

/** 셀에 값 쓰기 (기존 스타일 유지하면서) */
function writeCell(ws, ref, value) {
  const existing = ws[ref];
  ws[ref] = {
    ...(existing || {}),
    v: value,
    t: 's',
  };
}

/** 특정 행 삭제 (ref 제거) */
function deleteRows(ws, fromRow, toRow) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:D100');
  for (let r = fromRow - 1; r <= toRow - 1; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      delete ws[ref];
    }
  }
}

/** 행 삽입 (기존 데이터를 아래로 밀기) */
function shiftRowsDown(ws, fromRow, count) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:D100');
  // 아래에서 위로 복사
  for (let r = range.e.r; r >= fromRow - 1; r--) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const srcRef = XLSX.utils.encode_cell({ r, c });
      const dstRef = XLSX.utils.encode_cell({ r: r + count, c });
      if (ws[srcRef]) {
        ws[dstRef] = { ...ws[srcRef] };
        delete ws[srcRef];
      }
    }
  }
  // 병합도 밀기
  if (ws['!merges']) {
    ws['!merges'] = ws['!merges'].map(m => {
      if (m.s.r >= fromRow - 1) {
        return {
          s: { r: m.s.r + count, c: m.s.c },
          e: { r: m.e.r + count, c: m.e.c },
        };
      }
      return m;
    });
  }
}

/* ── 시트1: 원산지정보 수정 ──────────────────────────────────── */
function fillSheet1(ws, origins) {
  // menuName 기준 그룹핑
  const menuMap = new Map();
  for (const row of origins) {
    const key = row.menuName || row.ingredientName || '';
    if (!menuMap.has(key)) menuMap.set(key, { subCat: getSubCat(row), menuName: key, parts: [] });
    menuMap.get(key).parts.push(toIngText(row));
  }

  const subOrder = ['프리미엄 스페셜', '프리미엄', '오리지널', '하프앤하프', '1인피자', '사이드', '기타'];
  const menuRows = [...menuMap.values()].sort((a, b) => {
    const ia = subOrder.indexOf(a.subCat), ib = subOrder.indexOf(b.subCat);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // 중분류별 그룹
  const groups = [];
  let cur = null;
  for (const r of menuRows) {
    if (!cur || cur.subCat !== r.subCat) { cur = { subCat: r.subCat, rows: [] }; groups.push(cur); }
    cur.rows.push(r);
  }

  // 기존 데이터 행(6~27) 제거, 주의문구 행(29~30) 보존
  const templateDataEnd = 27;
  deleteRows(ws, 6, templateDataEnd);

  // 새 데이터 행 작성 (행6부터)
  let rowIdx = 5; // 0-based (행6 = index 5)
  const newMerges = [];

  // 기존 병합 중 header 부분(행1~5)만 유지
  ws['!merges'] = (ws['!merges'] || []).filter(m => m.e.r < 5);

  for (const g of groups) {
    const startR = rowIdx;
    for (let i = 0; i < g.rows.length; i++) {
      const r = g.rows[i];
      if (i === 0) {
        ws[XLSX.utils.encode_cell({ r: rowIdx, c: 0 })] = { v: g.subCat, t: 's' };
      }
      ws[XLSX.utils.encode_cell({ r: rowIdx, c: 1 })] = { v: r.menuName, t: 's' };
      ws[XLSX.utils.encode_cell({ r: rowIdx, c: 2 })] = { v: r.parts.join(', '), t: 's' };
      // C:D 수평 병합
      newMerges.push({ s: { r: rowIdx, c: 2 }, e: { r: rowIdx, c: 3 } });
      rowIdx++;
    }
    // A열 수직 병합 (그룹 2개 이상)
    if (g.rows.length > 1) {
      newMerges.push({ s: { r: startR, c: 0 }, e: { r: rowIdx - 1, c: 0 } });
    }
  }

  // 주의문구 (빈 행 후)
  rowIdx++;
  const noticeRef = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
  ws[noticeRef] = { v: '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.', t: 's' };
  newMerges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 3 } });

  ws['!merges'].push(...newMerges);

  // 날짜 업데이트
  const date = new Date().toISOString().slice(0, 7).replace('-', '.');
  ws['D3'] = { v: date, t: 's' };

  // 범위 업데이트
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx, c: 3 } });
}

/* ── 시트2: 원산지표지판 수정 ────────────────────────────────── */
function fillSheet2(ws, origins) {
  // 표시품목+원산지 → 메뉴 그룹핑
  const itemMap = new Map();
  for (const row of origins) {
    const menuName = row.menuName || row.ingredientName || '';
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry }];
    for (const it of items) {
      if (!it.displayName && !it.originCountry) continue;
      const key = `${it.displayName || ''}||${it.originCountry || ''}`;
      if (!itemMap.has(key)) {
        itemMap.set(key, { displayName: it.displayName || '', originCountry: it.originCountry || '', menus: new Set() });
      }
      if (menuName) itemMap.get(key).menus.add(menuName);
    }
  }

  // 헤더 행(1~2) 유지, 기존 데이터 삭제
  deleteRows(ws, 3, 50);
  ws['!merges'] = (ws['!merges'] || []).filter(m => m.e.r < 2);

  let r = 2; // 0-based (행3)
  for (const { displayName, originCountry, menus } of itemMap.values()) {
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: displayName, t: 's' };
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: originCountry, t: 's' };
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: [...menus].join(', '), t: 's' };
    r++;
  }

  // 주의문구
  r++;
  ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.', t: 's' };
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 2 } });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 2 } });
}

/* ── 시트3: 냉장고부착용 수정 ────────────────────────────────── */
function fillSheet3(ws, origins) {
  // 헤더 행(1~2) 유지, 기존 데이터 삭제
  deleteRows(ws, 3, 50);
  ws['!merges'] = (ws['!merges'] || []).filter(m => m.e.r < 2);

  let r = 2; // 0-based (행3)
  for (const row of origins) {
    const menuName = row.menuName || row.ingredientName || '';
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry, originRegion: row.originRegion }];
    const valid = items.filter(it => it.displayName || it.originCountry);
    if (!valid.length) continue;

    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: menuName, t: 's' };
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: valid.map(it => it.displayName).filter(Boolean).join(', '), t: 's' };
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = {
      v: valid.map(it => [it.displayName, it.originCountry].filter(Boolean).join(':')).join('/'),
      t: 's',
    };
    r++;
  }

  // 주의문구
  r++;
  ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.', t: 's' };
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 2 } });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 2 } });
}

/* ── 메인 export 함수 ────────────────────────────────────────── */
export async function exportOriginToExcel(origins, filename = '원산지표시판') {
  // 템플릿 파일 로드
  const res = await fetch('/templates/원산지_템플릿.xlsx');
  if (!res.ok) throw new Error('템플릿 파일을 불러올 수 없습니다');
  const ab = await res.arrayBuffer();

  // 템플릿 파싱 (스타일 포함)
  const wb = XLSX.read(ab, { type: 'array', cellStyles: true, cellDates: true });

  const [sh1, sh2, sh3] = wb.SheetNames;

  fillSheet1(wb.Sheets[sh1], origins);
  fillSheet2(wb.Sheets[sh2], origins);
  fillSheet3(wb.Sheets[sh3], origins);

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}
