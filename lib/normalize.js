/**
 * lib/normalize.js — 메뉴명/제품명 정규화
 *
 * v2 src/common/normalize.js 이식.
 */

export function trimSpaces(str) {
  if (str == null) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

/** PS → PCS 표기 통일 (내부 사용) */
function normalizePCS(str) {
  if (str == null) return '';
  return String(str).replace(/(\d+)\s*PS\b/gi, '$1PCS');
}

/** 메뉴명 정규화: PCS 표기 통일 + trim + 공백 단일화 */
export function normalizeMenuName(raw) {
  if (raw == null) return '';
  let s = String(raw);
  s = normalizePCS(s);
  s = trimSpaces(s);
  return s;
}

/** 제품명 정규화: trim + 공백 단일화 */
export function normalizeProductName(raw) {
  if (raw == null) return '';
  return trimSpaces(String(raw));
}

/**
 * 식자재 표시명 단순화 — 제때 제품명에서 불필요한 토큰 제거
 *
 * 제거 대상:
 *   - 괄호 안 온도/포장 키워드: (냉동), (냉장), (통조림), (캔) 등
 *   - 무게/용량: 1kg, 500g, 1L, 500ml 등 (묶음 표시 포함: 200g×3, 18g*22매)
 *   - 온도/보관: 냉장, 냉동, 상온, 실온
 *   - 원산지: 국내산, 국산, 수입산, 외국산, 이탈리아산, 미국산 등
 *   - 말미 포장 키워드: 박스, BOX, 봉지
 */
export function simplifyIngredientName(raw) {
  if (!raw) return '';
  let s = String(raw).trim();

  // (냉동) (냉장) (통조림) (캔) 등 괄호 온도·포장 키워드
  s = s.replace(/\s*\((냉동|냉장|상온|실온|통조림|캔입?|병입?)\)\s*/g, ' ');

  // 숫자+단위 묶음 제거: 2.5kg, 500g, 1L, 200g×3, 18g*22매
  s = s.replace(
    /\s*\d+\.?\d*\s*(kg|g|L|l|ml|mL|cc)\s*([×x*]\s*\d+\s*(개|매|봉|팩|장|입)?)?\s*/g,
    ' ',
  );

  // 온도·보관 단어
  s = s.replace(/\s*(냉장|냉동|상온|실온)\s*/g, ' ');

  // 원산지: 국내산·수입산 + 주요 국가명+산
  s = s.replace(/\s*(국내산|국산|수입산|외국산)\s*/g, ' ');
  s = s.replace(
    /\s*(이탈리아|미국|호주|뉴질랜드|중국|캐나다|덴마크|프랑스|독일|스페인|태국|베트남|아르헨티나|브라질|칠레|네덜란드|벨기에|아일랜드|노르웨이)산\s*/g,
    ' ',
  );

  // 말미 포장 키워드 (끝에만)
  s = s.replace(/\s*(박스|BOX|봉지)\s*$/gi, '');

  return s.replace(/\s+/g, ' ').trim();
}
