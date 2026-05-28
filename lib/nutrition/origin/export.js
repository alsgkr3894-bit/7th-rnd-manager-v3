/**
 * lib/nutrition/origin/export.js
 * 원산지 정보 → 엑셀 3시트 출력
 *
 * 시트 구조 (TalkFile_원산지표시판정리파일_B타입 기준):
 *   1. 원산지정보      : 구분 | 메뉴명 | 재료명(원산지)
 *   2. 원산지표지판    : 표시품목 | 원산지 | 메뉴명
 *   3. 냉장고부착용    : 음식명 | 표시품목 | 원산지
 */
import * as XLSX from 'xlsx';

/** items 배열 → "표시품목:원산지" 텍스트 */
function itemsToText(items = []) {
  return items
    .filter(it => it.displayName || it.originCountry)
    .map(it => {
      const parts = [it.displayName, it.originCountry].filter(Boolean);
      return parts.join(':');
    })
    .join(' / ');
}

/** 메뉴명에서 중분류 추출 (menuCode 기반, 없으면 카테고리) */
function getSubCategory(row) {
  if (!row.menuCode) return row.category || '기타';
  const parts = row.menuCode.toUpperCase().split('-');
  const sub = parts[1];
  const map = { PS: '프리미엄 스페셜', PR: '프리미엄', OR: '오리지널', HH: '하프앤하프', ONE: '1인피자' };
  return map[sub] || row.subCategory || row.category || '기타';
}

export function exportOriginToExcel(origins, filename = '원산지표시판') {
  const wb = XLSX.utils.book_new();

  /* ── 시트 1: 원산지정보 ───────────────────────────────────── */
  const sheet1Data = [
    ['원산지 표기'],
    [''],
    ['구분', '', '재 료 명(원산지)'],
  ];

  // 중분류별 그룹핑
  const groups = new Map();
  for (const row of origins) {
    const sub = getSubCategory(row);
    if (!groups.has(sub)) groups.set(sub, []);
    groups.get(sub).push(row);
  }

  for (const [sub, rows] of groups) {
    let firstInGroup = true;
    for (const row of rows) {
      const menuName = row.menuName || row.ingredientName || '';
      const itemText = itemsToText(row.items?.length ? row.items : [
        { displayName: row.displayName, originCountry: row.originCountry }
      ]);
      sheet1Data.push([
        firstInGroup ? sub : '',
        menuName,
        itemText,
      ]);
      firstInGroup = false;
    }
  }

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws1, '원산지정보');

  /* ── 시트 2: 원산지표지판 ────────────────────────────────── */
  // 표시품목+원산지 기준으로 그룹핑 → 어떤 메뉴에 해당하는지 나열
  const sheet2Data = [
    ['원산지 표시판'],
    ['표시품목', '원산지', '메뉴명'],
  ];

  // 품목+원산지 조합 → 메뉴명 목록
  const itemMap = new Map(); // key: "displayName||originCountry" → Set<menuName>
  for (const row of origins) {
    const menuName = row.menuName || row.ingredientName || '';
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry }];

    for (const it of items) {
      if (!it.displayName && !it.originCountry) continue;
      const key = `${it.displayName || ''}||${it.originCountry || ''}`;
      if (!itemMap.has(key)) itemMap.set(key, { displayName: it.displayName, originCountry: it.originCountry, menus: new Set() });
      if (menuName) itemMap.get(key).menus.add(menuName);
    }
  }

  for (const { displayName, originCountry, menus } of itemMap.values()) {
    sheet2Data.push([
      displayName || '',
      originCountry || '',
      [...menus].join(', '),
    ]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws2, '원산지표지판');

  /* ── 시트 3: 냉장고부착용 ────────────────────────────────── */
  const sheet3Data = [
    ['원산지 표시판'],
    ['음식명', '표시품목', '원산지'],
  ];

  for (const row of origins) {
    const menuName = row.menuName || row.ingredientName || '';
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry, originRegion: row.originRegion }];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.displayName && !it.originCountry) continue;
      const origin = [it.originCountry, it.originRegion].filter(Boolean).join(' ');
      sheet3Data.push([
        i === 0 ? menuName : '',  // 첫 번째 품목에만 음식명 표시
        it.displayName || '',
        origin,
      ]);
    }
  }

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws3, '원산지표지판(냉장고부착용)');

  /* ── 다운로드 ─────────────────────────────────────────────── */
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}
