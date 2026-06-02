/**
 * lib/nutrition/origin/export.js
 * 원산지 → 엑셀 출력 (템플릿 없이 직접 생성)
 *
 * 시트1 매장비치용   : 표시품목 / 원산지 / 음식명
 * 시트2 냉장고부착용 : 재료명 / 표시품목 / 원산지
 * 시트3 배달플랫폼용 : 메뉴명 / 재료명(표시품목:원산지)
 */
import { loadXlsx } from '@/lib/excel';

let XLSX;

const DISCLAIMER = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';

/**
 * @param {{ sheet1, sheet2, sheet3 }} data — OriginResult.jsx의 빌드 결과 그대로 수신
 * @param {string} [filename]
 */
export async function exportOriginToExcel({ sheet1, sheet2, sheet3 }, filename = '원산지표시판') {
  XLSX = await loadXlsx();

  const wb = XLSX.utils.book_new();

  // ── 시트1: 매장비치용 ──────────────────────────────────────
  const ws1Rows = [
    ['원산지 표시판 (매장비치용)'],
    ['표시품목', '원산지', '음식명'],
    ...sheet1.map(r => [r.displayName, r.originCountry, [...r.menus].join(', ')]),
    [],
    [DISCLAIMER],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Rows);
  ws1['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws1, '매장비치용');

  // ── 시트2: 냉장고부착용 ────────────────────────────────────
  const ws2Rows = [
    ['원산지 표시판 (냉장고부착용)'],
    ['재료명', '표시품목', '원산지'],
    ...sheet2.map(r => [r.ingredientName, r.displayName, r.originCountry]),
    [],
    [DISCLAIMER],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Rows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, '냉장고부착용');

  // ── 시트3: 배달플랫폼용 ────────────────────────────────────
  const ws3Rows = [
    ['배달플랫폼 원산지 표기'],
    ['메뉴명', '재료명(원산지)'],
    ...sheet3.map(r => [r.menuName, r.parts.join(', ')]),
    [],
    [DISCLAIMER],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(ws3Rows);
  ws3['!cols'] = [{ wch: 30 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws3, '배달플랫폼용');

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}
