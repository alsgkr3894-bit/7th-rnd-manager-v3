/**
 * lib/sales/parse-header.js — 헤더 컬럼 탐지
 *
 * 화이트리스트 정확 매칭:
 *   - 메뉴명:   '메뉴명' | '메뉴 명'
 *   - 판매량:   '판매량(개)' | '판매량 (개)'
 *   - 매출액:   선택 컬럼. 있으면 통계/보고서 금액 집계에 사용
 */

const MENU_HEADER_WHITELIST = ['메뉴명', '메뉴 명'];
const QTY_HEADER_WHITELIST = ['판매량(개)', '판매량 (개)'];
const REVENUE_HEADER_WHITELIST = [
  '매출액',
  '매출',
  '판매금액',
  '판매 금액',
  '판매액',
  '결제금액',
  '결제 금액',
  '합계금액',
  '합계 금액',
  '총매출',
  '총 매출',
  '총매출액',
  '총 매출액',
  '금액',
];

function compactHeader(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '');
}

const REVENUE_HEADER_COMPACT = new Set(REVENUE_HEADER_WHITELIST.map(compactHeader));

/**
 * @returns { success, menuColumnIndex?, quantityColumnIndex?, revenueColumnIndex?, reason? }
 */
export function detectHeaderColumns(headerRow) {
  if (!Array.isArray(headerRow) || headerRow.length === 0) {
    return { success: false, reason: '헤더 행이 비어있습니다.' };
  }

  let menuIdx = -1;
  let qtyIdx = -1;
  let revenueIdx = -1;

  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    const raw = cell == null ? '' : String(cell).trim();
    if (!raw) continue;
    if (MENU_HEADER_WHITELIST.includes(raw)) menuIdx = i;
    if (QTY_HEADER_WHITELIST.includes(raw)) qtyIdx = i;
    if (REVENUE_HEADER_WHITELIST.includes(raw) || REVENUE_HEADER_COMPACT.has(compactHeader(raw))) {
      revenueIdx = i;
    }
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
  return {
    success: true,
    menuColumnIndex: menuIdx,
    quantityColumnIndex: qtyIdx,
    revenueColumnIndex: revenueIdx,
  };
}
