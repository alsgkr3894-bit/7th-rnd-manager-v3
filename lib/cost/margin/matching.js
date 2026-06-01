/**
 * lib/cost/margin/matching.js — 원가마진표 레시피↔디테일 매칭 순수 함수
 *
 * IO 없음, 사이드 이펙트 없음 → 단위 테스트 가능.
 * 기존 app/cost/margin/page.jsx load() 내 인라인 로직을 분리.
 */

/**
 * 카테고리 호환 판정: 정확 일치 또는 부모/자식(슬래시 경계).
 *
 * 원가레시피는 넓은 카테고리('피자')로, 메뉴마스터/가격표는 세부 카테고리
 * ('피자/프리미엄 스페셜')로 저장하므로 exact match만으로는 2줄 중복이 생긴다.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function catCompatible(a, b) {
  return a === b || (!!a && !!b && (a.startsWith(b + '/') || b.startsWith(a + '/')));
}

/**
 * 레시피 행 배열을 menuName → row[] 맵으로 빌드.
 * 같은 메뉴명에 복수 레시피(예: 카테고리가 다른 중복)가 있을 수 있다.
 *
 * @param {object[]} recipeRows
 * @returns {Map<string, object[]>}
 */
export function buildRecipesByName(recipeRows) {
  const map = new Map();
  for (const r of recipeRows) {
    const arr = map.get(r.menuName);
    if (arr) arr.push(r); else map.set(r.menuName, [r]);
  }
  return map;
}

/**
 * 디테일 행(name, cat)에 매칭되는 레시피를 반환.
 * 호환 카테고리 중 원가 있는 것 우선, 없으면 첫 호환 행 fallback.
 *
 * @param {Map<string, object[]>} recipesByName - buildRecipesByName 결과
 * @param {string} name  - 메뉴명
 * @param {string} cat   - 카테고리
 * @returns {object|null}
 */
export function findRecipeForDetail(recipesByName, name, cat) {
  const arr = recipesByName.get(name);
  if (!arr) return null;
  let fallback = null;
  for (const r of arr) {
    if (!catCompatible(r.menuCategory || '', cat || '')) continue;
    if (Object.values(r.costMap).some(v => v > 0)) return r;
    if (!fallback) fallback = r;
  }
  return fallback;
}

/**
 * 디테일 행(d)에 매칭 레시피(rr)의 정보를 fallback으로 병합.
 *   - 디테일 스토어 값 항상 우선
 *   - 레시피는 "빈 판매가 · 없는 사이즈 · 빈 원가"만 보완
 *
 * @param {object} d             - 디테일 행
 * @param {Map}    recipesByName - buildRecipesByName 결과
 * @param {(v:any)=>number|null} toNum - 값 → 숫자 정규화 함수
 * @returns {object}
 */
export function mergeRecipeIntoDetail(d, recipesByName, toNum) {
  const rr = findRecipeForDetail(recipesByName, d.menuName, d.menuCategory);
  if (!rr) return d;

  // 사이즈 합집합 (디테일 우선, 레시피에만 있는 사이즈는 뒤에 추가)
  const sizeByLabel = new Map();
  for (const s of (d.sizes || [])) {
    if (s.label) sizeByLabel.set(s.label, { ...s, sellingPrice: toNum(s.sellingPrice) });
  }
  for (const s of (rr.sizes || [])) {
    if (!s.label) continue;
    const price = toNum(s.sellingPrice);
    const existing = sizeByLabel.get(s.label);
    if (!existing) sizeByLabel.set(s.label, { label: s.label, sellingPrice: price });
    else if (existing.sellingPrice == null && price != null) existing.sellingPrice = price;
  }

  // 원가 합집합 (디테일 원가 우선, 빈 사이즈만 레시피 원가로 보완)
  const costMap = { ...d.costMap };
  for (const label of sizeByLabel.keys()) {
    if (!(costMap[label] > 0) && rr.costMap?.[label] > 0) costMap[label] = rr.costMap[label];
  }

  return { ...d, sizes: [...sizeByLabel.values()], costMap };
}
