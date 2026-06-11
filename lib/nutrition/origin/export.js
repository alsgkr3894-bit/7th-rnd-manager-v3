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
import { withDownloadDateSuffix } from '@/lib/download';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

let XLSX;

const DISCLAIMER = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';
const EMPTY_SET = new Set();
const asSet = value => (value instanceof Set ? value : EMPTY_SET);
const menuNames = value =>
  Array.isArray(value) ? value.map(asDisplayText).filter(Boolean) : [...asSet(value)];

/**
 * @param {{ sheet1, sheet2, sheet3 }} data — OriginResult.jsx의 빌드 결과 그대로 수신
 * @param {string} [filename]
 */
export async function exportOriginToExcel(
  { sheet1, sheet2, sheet3, sheet4 = [] } = {},
  filename = '원산지표시판'
) {
  XLSX = await loadXlsx();

  const wb = XLSX.utils.book_new();
  const safeSheet1 = asObjectArray(sheet1);
  const safeSheet2 = asObjectArray(sheet2);
  const safeSheet3 = asObjectArray(sheet3);
  const safeSheet4 = asObjectArray(sheet4);

  // ── 시트1: 매장비치용 ──────────────────────────────────────
  const ws1Rows = [
    ['원산지 표시판 (매장비치용)'],
    ['표시품목', '원산지', '음식명'],
    ...safeSheet1.map(r => [
      asDisplayText(r.displayName),
      asDisplayText(r.originCountry),
      menuNames(r.menus).join(', '),
    ]),
    [],
    [DISCLAIMER],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Rows);
  ws1['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws1, '매장비치용');

  // ── 시트2: 냉장고부착용 (재료당 1행, 표시품목:원산지 한 줄) ────
  const ws2Rows = [
    ['원산지 표시판 (냉장고부착용)'],
    ['재료명', '표시품목', '원산지'],
    ...safeSheet2.map(r => [
      asDisplayText(r.ingredientName),
      asDisplayText(r.itemText),
      asDisplayText(r.originText),
    ]),
    [],
    [DISCLAIMER],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Rows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 28 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, ws2, '냉장고부착용');

  // ── 시트3: 배달플랫폼용 ────────────────────────────────────
  const ws3Rows = [
    ['배달플랫폼 원산지 표기'],
    ['구분', '메뉴명', '재료명(원산지)'],
    ...safeSheet3.map(r => [
      asDisplayText(r.group),
      asDisplayText(r.menuName),
      Array.isArray(r.parts) ? r.parts.map(part => asDisplayText(part)).join(', ') : '',
    ]),
    [],
    [DISCLAIMER],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(ws3Rows);
  ws3['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws3, '배달플랫폼용');

  // ── 시트4: 원산지정보 표기문 ───────────────────────────────
  const ws4Rows = [
    ['원산지 정보'],
    ...safeSheet4.map(r => [`${asDisplayText(r.names)}(${asDisplayText(r.breakdown)})`]),
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

  XLSX.writeFile(wb, withDownloadDateSuffix(`${filename}.xlsx`));
}
