/**
 * lib/nutrition/origin/export.js
 * 원산지 → 엑셀 출력 (템플릿 없이 직접 생성)
 *
 * 시트1 매장비치용   : 표시품목 / 원산지 / 음식명
 * 시트2 냉장고부착용 : 재료명 / 표시품목 / 원산지  (재료당 1행, 복수 원산지는 줄바꿈)
 * 시트3 배달플랫폼용 : 메뉴명 / 재료명(표시품목:원산지)
 * 시트4 원산지정보   : 재료명(표시품목 : 원산지[, 원산지 섞음], …) 표기문
 */
import { loadXlsx } from '@/lib/excel';

let XLSX;

const DISCLAIMER = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';

/**
 * @param {{ sheet1, sheet2, sheet3 }} data — OriginResult.jsx의 빌드 결과 그대로 수신
 * @param {string} [filename]
 */
export async function exportOriginToExcel({ sheet1, sheet2, sheet3, sheet4 = [] }, filename = '원산지표시판') {
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

  // ── 시트2: 냉장고부착용 (재료당 1행, 복수 원산지는 줄바꿈) ────
  const ws2Rows = [
    ['원산지 표시판 (냉장고부착용)'],
    ['재료명', '표시품목', '원산지'],
    ...sheet2.map(r => [
      r.ingredientName,
      r.items.map(it => it.displayName).join('\n'),
      r.items.map(it => it.country).join('\n'),
    ]),
    [],
    [DISCLAIMER],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Rows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }];
  // 줄바꿈 적용 — 데이터 행 (2행부터)
  for (let i = 2; i < ws2Rows.length - 2; i++) {
    const rowNum = i + 1; // 1-based
    ['B', 'C'].forEach(col => {
      const addr = `${col}${rowNum}`;
      if (ws2[addr]) {
        ws2[addr].s = { alignment: { wrapText: true, vertical: 'top' } };
      }
    });
  }
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

  // ── 시트4: 원산지정보 표기문 ───────────────────────────────
  const ws4Rows = [
    ['원산지 정보'],
    ...sheet4.map(r => [`${r.names}(${r.breakdown})`]),
    [],
    [DISCLAIMER],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(ws4Rows);
  ws4['!cols'] = [{ wch: 110 }];
  // 표기문 셀 줄바꿈/자동맞춤
  for (let i = 1; i < ws4Rows.length - 2; i++) {
    const addr = `A${i + 1}`;
    if (ws4[addr]) ws4[addr].s = { alignment: { wrapText: true, vertical: 'top' } };
  }
  XLSX.utils.book_append_sheet(wb, ws4, '원산지정보');

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}
