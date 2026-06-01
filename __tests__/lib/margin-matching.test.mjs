import {
  catCompatible,
  buildRecipesByName,
  findRecipeForDetail,
  mergeRecipeIntoDetail,
} from '../../lib/cost/margin/matching.js';

const toNum = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ─── catCompatible ────────────────────────────────────────────────────────────

describe('catCompatible', () => {
  test('정확 일치', () => {
    expect(catCompatible('피자', '피자')).toBe(true);
  });
  test('부모/자식 (슬래시 경계)', () => {
    expect(catCompatible('피자', '피자/프리미엄')).toBe(true);
    expect(catCompatible('피자/프리미엄', '피자')).toBe(true);
  });
  test('접두만 같고 슬래시 경계 아님 → false', () => {
    expect(catCompatible('피자', '피자류')).toBe(false);
  });
  test('빈 값 → false', () => {
    expect(catCompatible('', '피자')).toBe(false);
    expect(catCompatible('피자', '')).toBe(false);
  });
});

// ─── buildRecipesByName ───────────────────────────────────────────────────────

describe('buildRecipesByName', () => {
  test('메뉴명별 그룹핑', () => {
    const rows = [
      { menuName: 'A', menuCategory: '피자' },
      { menuName: 'A', menuCategory: '피자/스페셜' },
      { menuName: 'B', menuCategory: '사이드' },
    ];
    const map = buildRecipesByName(rows);
    expect(map.get('A')).toHaveLength(2);
    expect(map.get('B')).toHaveLength(1);
  });
});

// ─── findRecipeForDetail ──────────────────────────────────────────────────────

describe('findRecipeForDetail', () => {
  test('호환 카테고리 중 원가 있는 것 우선', () => {
    const map = buildRecipesByName([
      { menuName: 'A', menuCategory: '피자', costMap: { L: 0 } },
      { menuName: 'A', menuCategory: '피자', costMap: { L: 1000 } },
    ]);
    expect(findRecipeForDetail(map, 'A', '피자').costMap.L).toBe(1000);
  });
  test('원가 없으면 첫 호환 행 fallback', () => {
    const map = buildRecipesByName([
      { menuName: 'A', menuCategory: '피자', costMap: { L: 0 } },
    ]);
    expect(findRecipeForDetail(map, 'A', '피자/스페셜')).toBeTruthy();
  });
  test('메뉴명 없음 → null', () => {
    expect(findRecipeForDetail(new Map(), 'X', '피자')).toBeNull();
  });
  test('호환 카테고리 없음 → null', () => {
    const map = buildRecipesByName([
      { menuName: 'A', menuCategory: '사이드', costMap: { L: 1000 } },
    ]);
    expect(findRecipeForDetail(map, 'A', '피자')).toBeNull();
  });
});

// ─── mergeRecipeIntoDetail ────────────────────────────────────────────────────

describe('mergeRecipeIntoDetail', () => {
  test('매칭 레시피 없으면 원본 그대로', () => {
    const d = { menuName: 'X', menuCategory: '피자', sizes: [], costMap: {} };
    expect(mergeRecipeIntoDetail(d, new Map(), toNum)).toBe(d);
  });

  test('빈 판매가만 레시피로 보완 (디테일 우선)', () => {
    const map = buildRecipesByName([{
      menuName: 'A', menuCategory: '피자',
      sizes: [{ label: 'L', sellingPrice: 9000 }, { label: 'R', sellingPrice: 12000 }],
      costMap: { L: 3000, R: 4000 },
    }]);
    const d = {
      menuName: 'A', menuCategory: '피자',
      sizes: [{ label: 'L', sellingPrice: 8000 }, { label: 'R', sellingPrice: '' }],
      costMap: { L: 2500 },
    };
    const merged = mergeRecipeIntoDetail(d, map, toNum);
    const byLabel = Object.fromEntries(merged.sizes.map(s => [s.label, s.sellingPrice]));
    expect(byLabel.L).toBe(8000);  // 디테일 우선
    expect(byLabel.R).toBe(12000); // 빈 값 → 레시피 보완
    expect(merged.costMap.L).toBe(2500); // 디테일 원가 우선
    expect(merged.costMap.R).toBe(4000); // 빈 원가 → 레시피 보완
  });

  test('레시피에만 있는 사이즈는 뒤에 추가', () => {
    const map = buildRecipesByName([{
      menuName: 'A', menuCategory: '피자',
      sizes: [{ label: 'XL', sellingPrice: 15000 }],
      costMap: { XL: 5000 },
    }]);
    const d = { menuName: 'A', menuCategory: '피자', sizes: [{ label: 'L', sellingPrice: 8000 }], costMap: { L: 2500 } };
    const merged = mergeRecipeIntoDetail(d, map, toNum);
    expect(merged.sizes.map(s => s.label)).toEqual(['L', 'XL']);
    expect(merged.costMap.XL).toBe(5000);
  });
});
