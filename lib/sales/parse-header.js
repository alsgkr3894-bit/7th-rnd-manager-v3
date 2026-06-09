/**
 * lib/sales/parse-header.js — 헤더 컬럼 탐지
 *
 * 화이트리스트 정확 매칭:
 *   - 메뉴명:   '메뉴명' | '메뉴 명'
 *   - 판매량:   '판매량(개)' | '판매량 (개)'
 */

const MENU_HEADER_WHITELIST = ['메뉴명', '메뉴 명'];
const QTY_HEADER_WHITELIST = ['판매량(개)', '판매량 (개)'];

/**
 * @returns { success, menuColumnIndex?, quantityColumnIndex?, reason? }
 */
export function detectHeaderColumns(headerRow) {
  if (!Array.isArray(headerRow) || headerRow.length === 0) {
    return { success: false, reason: '헤더 행이 비어있습니다.' };
  }

  let menuIdx = -1;
  let qtyIdx = -1;

  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    const raw = cell == null ? '' : String(cell).trim();
    if (!raw) continue;
    if (MENU_HEADER_WHITELIST.includes(raw)) menuIdx = i;
    if (QTY_HEADER_WHITELIST.includes(raw)) qtyIdx = i;
  }

  if (menuIdx === -1) {
    return {
      success: false,
      reason: '필수 헤더 "메뉴명"을 찾을 수 없습니다. (허용: "메뉴명", "메뉴 명")',
    };
  }
  if (qtyIdx === -1) {
    return {
      success: false,
      reason: '필수 헤더 "판매량(개)"을 찾을 수 없습니다. (허용: "판매량(개)", "판매량 (개)")',
    };
  }
  return { success: true, menuColumnIndex: menuIdx, quantityColumnIndex: qtyIdx };
}
