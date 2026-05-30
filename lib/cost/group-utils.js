/**
 * 레시피 그룹(공통묶음) 편집 상태 관련 순수 유틸리티.
 * recipe-groups/page.jsx와 manage/page.jsx가 공유한다.
 */

/** 새 그룹의 빈 draft를 반환한다. */
export function emptyGroup() {
  return {
    name: '',
    description: '',
    sizes: ['L', 'R'],
    defaultCategories: [
      '피자', '피자/프리미엄 스페셜', '피자/프리미엄',
      '피자/오리지널', '피자/하프앤하프',
    ],
    ingredients: [],
  };
}

/**
 * 저장된 그룹 레코드를 편집용 draft로 변환한다.
 * ingredients 배열의 quantities를 얕은 복사하여 원본을 보호한다.
 */
export function groupToDraft(g) {
  return {
    ...g,
    sizes:              g.sizes?.length ? g.sizes : ['L', 'R'],
    defaultCategories:  g.defaultCategories || [],
    ingredients:        (g.ingredients || []).map(i => ({
      ...i,
      quantities: { ...(i.quantities || {}) },
    })),
  };
}
