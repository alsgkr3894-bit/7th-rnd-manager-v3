import { asDisplayText } from '@/lib/ui/prop-guards';

function uniqueDisplayTexts(values) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : [values]) {
    const text = asDisplayText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

/** 표시품목 열: "돼지고기, 쇠고기(페페로니)" / "치즈(까망베르, 모짜렐라, 고다)" */
export function formatStoreDisplayItem(displayNames, ingredientNames = []) {
  const items = uniqueDisplayTexts(displayNames).join(', ');
  const names = uniqueDisplayTexts(ingredientNames).join(', ');
  if (!items) return names;
  if (!names) return items;
  return `${items}(${names})`;
}

// 식자재 관리의 원산지 값은 "호주산,뉴질랜드산"처럼 쉼표로 여러 나라를 담는다 —
// 표시판에는 원산지정보 표기문(buildOriginStatementSheet)과 같은 규칙으로 "섞음"을 붙인다.
export function formatStoreMixedCountry(country) {
  const text = asDisplayText(country);
  if (!text || !text.includes(',') || /섞음$/.test(text)) return text;
  return `${text} 섞음`;
}

/** 원산지 열: "(돼지고기:국내산/쇠고기:호주산)" — 전체를 괄호로 감싼다 */
export function formatStoreOriginCountry(parts) {
  const safeParts = (Array.isArray(parts) ? parts : [parts])
    .map(part => {
      if (!part || typeof part !== 'object') return '';
      const label = asDisplayText(part.label);
      const country = formatStoreMixedCountry(part.country);
      if (!country) return label;
      return label ? `${label}:${country}` : country;
    })
    .filter(Boolean);
  if (!safeParts.length) return '';
  return `(${safeParts.join('/')})`;
}

/** 메뉴명 열의 피자 메뉴는 "피자" 단어를 뺀다: "샘스테이크 피자" → "샘스테이크" */
export function stripPizzaWord(menuName) {
  const name = asDisplayText(menuName);
  if (!name) return name;
  const stripped = name
    .replace(/\s*피자/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return stripped || name;
}
