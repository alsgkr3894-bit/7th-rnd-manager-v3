/**
 * lib/cost/recipe-groups/apply.js — 공통묶음 그룹의 레시피 적용 판별 (순수 함수)
 *
 * margin 페이지에서 레시피마다 "어떤 그룹이 기본 적용되는가"를 계산할 때 사용한다.
 * 같은 menuCategory 를 가진 레시피가 많으므로, 카테고리별 결과를 캐싱해
 * 그룹 전체 순회 횟수를 (레시피 수)에서 (서로 다른 카테고리 수)로 줄인다.
 */

/**
 * 그룹이 특정 메뉴 카테고리에 기본 적용되는지 판별.
 * defaultCategories 의 한 항목이 menuCategory 와 정확히 일치하거나
 * 'cat/' 접두사로 시작하면 적용 대상이다.
 *
 * @param {{ defaultCategories?: string[] }} group
 * @param {string} menuCategory
 * @returns {boolean}
 */
export function groupAppliesToCategory(group, menuCategory) {
  const mc = menuCategory || '';
  return (group?.defaultCategories || []).some(
    c => mc === c || mc.startsWith(c + '/'),
  );
}

/**
 * menuCategory → 기본 적용 그룹 id Set 을 캐싱하는 리졸버를 만든다.
 * 반환된 함수는 동일 카테고리에 대해 그룹 순회를 1회만 수행한다.
 *
 * @param {Array<{ id: any, defaultCategories?: string[] }>} allGroups
 * @returns {(menuCategory: string) => Set<any>}
 */
export function createDefaultGroupResolver(allGroups) {
  const groups = Array.isArray(allGroups) ? allGroups : [];
  const cache = new Map();
  return (menuCategory) => {
    const key = menuCategory || '';
    let set = cache.get(key);
    if (!set) {
      set = new Set(
        groups.filter(g => groupAppliesToCategory(g, key)).map(g => g.id),
      );
      cache.set(key, set);
    }
    return set;
  };
}
