/**
 * lib/cost/menu-price/template.js — 메뉴 판매가 양식 데이터·헤더
 */

export const MENU_PRICE_CATEGORIES = ['피자', '1인피자', '사이드', '세트박스'];

/** 피자 분류는 L/R 규격, 그 외는 단일 */
export function defaultSizesFor(category) {
  return category === '피자' ? ['L', 'R'] : ['단일'];
}

/** 엑셀/CSV 양식 헤더 */
export const TEMPLATE_HEADERS = ['분류', '메뉴명', '규격', '판매가', '비고'];

/** 양식 다운로드용 샘플 행 — 사용자가 채워서 다시 업로드 */
export const TEMPLATE_SAMPLE_ROWS = [
  ['피자',     '슈퍼콤비네이션', 'L',  '32000', ''],
  ['피자',     '슈퍼콤비네이션', 'R',  '24000', ''],
  ['1인피자',  '치즈',           '단일', '8900',  ''],
  ['사이드',   '오븐스파게티',   '단일', '6900',  ''],
  ['세트박스', '패밀리박스 L',   '단일', '42000', '슈퍼콤비L + 스파게티'],
];

/** 양식에 들어갈 전체 행 (헤더 + 샘플) */
export function buildTemplateRows() {
  return [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS];
}
