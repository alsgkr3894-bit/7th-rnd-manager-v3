/**
 * lib/nutrition/origin/export.js
 * 원산지 → 엑셀 3시트 출력 (B타입 양식 동일 구조)
 *
 * 시트1 원산지정보    : 구분(중분류) | 메뉴명 | 재료명(원산지)  [4컬럼, A:D]
 * 시트2 원산지표지판  : 표시품목 | 원산지 | 메뉴명            [3컬럼, A:C]
 * 시트3 냉장고부착용  : 음식명 | 표시품목 | 원산지            [3컬럼, A:C]
 */
import * as XLSX from 'xlsx';

/* ── 고정 텍스트 ─────────────────────────────────────────────── */
const LEGAL_ITEMS =
  '원산지 표시항목(29개 품목) : 쇠고기, 돼지고기, 닭고기, 오리고기, 양고기, 염소고기, 쌀, 배추김치, 콩, ' +
  '넙치, 조피볼락, 참돔, 미꾸라지, 뱀장어, 낙지, 명태, 고등어, 갈치, 오징어, 꽃게, ' +
  '참조기, 다랑어, 아귀, 주꾸미, 가리비, 우렁쉥이, 전복, 방어, 부세';

const PIZZA_COMMON =
  '피자공통 - 도우(밀 : 미국산, 캐나다산, 흑미 : 국내산), 씬바사삭(밀 : 말레이시아산, 그레인 : 미국산, 캐나다산, 호주산, 흑미 : 태국산), ' +
  '치즈블렌드(까망베르치즈 : 덴마크산, 모짜렐라치즈 : 덴마크산, 미국산, 고다치즈 : 네덜란드산)';

const NOTICE = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';

/* ── 유틸 ────────────────────────────────────────────────────── */
/** 중분류 추출 (menuCode 우선, 없으면 subCategory) */
function getSubCat(row) {
  if (row.menuCode) {
    const p = row.menuCode.toUpperCase().split('-');
    const map = { PS: '프리미엄 스페셜', PR: '프리미엄', OR: '오리지널', HH: '하프앤하프', ONE: '1인피자' };
    if (map[p[1]]) return map[p[1]];
  }
  return row.subCategory || row.category || '기타';
}

/** 한 원산지 레코드 → "재료명(표시품목:원산지, ...)" 텍스트 */
function toIngredientText(row) {
  const items = row.items?.length
    ? row.items
    : [{ displayName: row.displayName, originCountry: row.originCountry }];
  const inner = items
    .filter(it => it.displayName || it.originCountry)
    .map(it => `${it.displayName}${it.originCountry ? ':' + it.originCountry : ''}`)
    .join(', ');
  const name = row.ingredientName || '';
  return name ? `${name}(${inner})` : inner;
}

/** 셀 병합 헬퍼 */
function merge(ws, range) {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push(XLSX.utils.decode_range(range));
}

/** 셀 값 설정 헬퍼 */
function setCell(ws, ref, value, wrapText = false) {
  ws[ref] = { v: value, t: 's', s: wrapText ? { alignment: { wrapText: true, vertical: 'top' } } : undefined };
}

/* ── 시트 1: 원산지정보 ──────────────────────────────────────── */
function buildSheet1(origins) {
  const ws = {};
  const date = new Date().toISOString().slice(0, 7).replace('-', '.');

  // 행1: 제목
  setCell(ws, 'A1', '원산지 표기');
  // 행2: 법정 표시항목
  setCell(ws, 'A2', LEGAL_ITEMS, true);
  // 행3: 날짜
  setCell(ws, 'D3', date);
  // 행4: 피자공통 설명
  setCell(ws, 'A4', PIZZA_COMMON, true);
  // 행5: 헤더
  setCell(ws, 'A5', '구분');
  setCell(ws, 'C5', '재 료 명(원산지)');

  // 데이터: menuName 기준으로 그룹핑 후 중분류 순 정렬
  // 같은 menuName의 원산지 레코드를 하나의 셀로 합침
  const menuMap = new Map(); // menuName → { subCat, menuName, text }
  for (const row of origins) {
    const key = row.menuName || row.ingredientName || '';
    if (!menuMap.has(key)) {
      menuMap.set(key, { subCat: getSubCat(row), menuName: key, parts: [] });
    }
    menuMap.get(key).parts.push(toIngredientText(row));
  }

  // 중분류 순으로 정렬
  const subOrder = ['프리미엄 스페셜', '프리미엄', '오리지널', '하프앤하프', '1인피자'];
  const menuRows = [...menuMap.values()].sort((a, b) => {
    const ia = subOrder.indexOf(a.subCat), ib = subOrder.indexOf(b.subCat);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  // 중분류 그룹 찾기
  const groups = new Map();
  for (const r of menuRows) {
    if (!groups.has(r.subCat)) groups.set(r.subCat, []);
    groups.get(r.subCat).push(r);
  }

  let rowIdx = 6; // 행6부터 시작 (1-based)
  for (const [subCat, rows] of groups) {
    const startRow = rowIdx;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const ref = (col) => `${col}${rowIdx}`;
      if (i === 0) setCell(ws, ref('A'), subCat, true);
      setCell(ws, ref('B'), r.menuName, true);
      setCell(ws, ref('C'), r.parts.join(', '), true);
      merge(ws, `C${rowIdx}:D${rowIdx}`);
      rowIdx++;
    }
    if (rows.length > 1) merge(ws, `A${startRow}:A${rowIdx - 1}`);
  }

  // 마지막: 주의 문구
  const noticeRow = rowIdx + 1;
  setCell(ws, `A${noticeRow}`, NOTICE, true);
  merge(ws, `A${noticeRow}:D${noticeRow}`);

  // 병합 (고정)
  merge(ws, 'A1:D1');
  merge(ws, 'A2:D2');
  merge(ws, 'A4:D4');
  merge(ws, 'A5:B5');
  merge(ws, 'C5:D5');

  ws['!ref'] = `A1:D${noticeRow}`;
  ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 50 }, { wch: 12 }];
  return ws;
}

/* ── 시트 2: 원산지표지판 ────────────────────────────────────── */
function buildSheet2(origins) {
  const ws = {};

  setCell(ws, 'A1', '원산지 표시판');
  setCell(ws, 'A2', '표시품목');
  setCell(ws, 'B2', '원산지');
  setCell(ws, 'C2', '메뉴명');

  // 표시품목+원산지 조합 → 해당 메뉴들 묶기
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
        itemMap.set(key, {
          displayName: it.displayName || '',
          originCountry: it.originCountry || '',
          menus: new Set(),
        });
      }
      if (menuName) itemMap.get(key).menus.add(menuName);
    }
  }

  let r = 3;
  for (const { displayName, originCountry, menus } of itemMap.values()) {
    setCell(ws, `A${r}`, displayName, true);
    setCell(ws, `B${r}`, originCountry, true);
    setCell(ws, `C${r}`, [...menus].join(', '), true);
    r++;
  }

  // 주의 문구
  r++;
  setCell(ws, `A${r}`, NOTICE, true);
  merge(ws, `A${r}:C${r}`);

  merge(ws, 'A1:C1');
  ws['!ref'] = `A1:C${r}`;
  ws['!cols'] = [{ wch: 26 }, { wch: 34 }, { wch: 46 }];
  return ws;
}

/* ── 시트 3: 냉장고부착용 ────────────────────────────────────── */
function buildSheet3(origins) {
  const ws = {};

  setCell(ws, 'A1', '원산지 표시판');
  setCell(ws, 'A2', '음식명');
  setCell(ws, 'B2', '표시품목');
  setCell(ws, 'C2', '원산지');

  let r = 3;
  for (const row of origins) {
    const menuName = row.menuName || row.ingredientName || '';
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry, originRegion: row.originRegion }];

    const validItems = items.filter(it => it.displayName || it.originCountry);
    if (!validItems.length) continue;

    // 음식명: 첫 번째 품목 행에만
    setCell(ws, `A${r}`, menuName, true);
    // 표시품목: displayName들 join
    setCell(ws, `B${r}`, validItems.map(it => it.displayName).filter(Boolean).join(', '), true);
    // 원산지: "displayName:originCountry" / 구분으로 join
    const originText = validItems
      .map(it => {
        const parts = [it.displayName, it.originCountry].filter(Boolean);
        return parts.join(':');
      })
      .join('/');
    setCell(ws, `C${r}`, originText, true);
    r++;
  }

  // 주의 문구
  r++;
  setCell(ws, `A${r}`, NOTICE, true);
  merge(ws, `A${r}:C${r}`);

  merge(ws, 'A1:C1');
  ws['!ref'] = `A1:C${r}`;
  ws['!cols'] = [{ wch: 24 }, { wch: 24 }, { wch: 38 }];
  return ws;
}

/* ── 메인 export 함수 ────────────────────────────────────────── */
export function exportOriginToExcel(origins, filename = '원산지표시판') {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildSheet1(origins), '원산지정보');
  XLSX.utils.book_append_sheet(wb, buildSheet2(origins), '원산지표지판');
  XLSX.utils.book_append_sheet(wb, buildSheet3(origins), '원산지표지판(냉장고부착용)');

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}
