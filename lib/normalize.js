function trimSpaces(str) {
  if (str == null) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

/** 제품명 정규화: trim + 공백 단일화 */
export function normalizeProductName(raw) {
  if (raw == null) return '';
  return trimSpaces(String(raw));
}

/** 식자재 표시명 단순화 — 제때 제품명에서 불필요한 토큰 제거 */
export function simplifyIngredientName(raw) {
  if (!raw) return '';
  let s = String(raw).trim();

  s = s.replace(/\s*\((냉동|냉장|상온|실온|통조림|캔입?|병입?)\)\s*/g, ' ');
  s = s.replace(
    /\s*\d+\.?\d*\s*(kg|g|L|l|ml|mL|cc)\s*([×x*]\s*\d+\s*(개|매|봉|팩|장|입)?)?\s*/g,
    ' '
  );
  s = s.replace(/\s*(냉장|냉동|상온|실온)\s*/g, ' ');
  s = s.replace(/\s*(국내산|국산|수입산|외국산)\s*/g, ' ');
  s = s.replace(
    /\s*(이탈리아|미국|호주|뉴질랜드|중국|캐나다|덴마크|프랑스|독일|스페인|태국|베트남|아르헨티나|브라질|칠레|네덜란드|벨기에|아일랜드|노르웨이)산\s*/g,
    ' '
  );
  s = s.replace(/\s*(박스|BOX|봉지)\s*$/gi, '');

  return s.replace(/\s+/g, ' ').trim();
}
