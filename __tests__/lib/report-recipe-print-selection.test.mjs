import { describe, expect, test } from '@jest/globals';
import {
  isRecipeMenuSelected,
  isRecipeKindEnabled,
  filterRecipePrintMenus,
  filterRecipePrintRows,
  buildRecipePrintSections,
  buildRecipeMenuGroups,
  pruneRecipeSelection,
  RECIPE_PAGE_PER_MENU_KINDS,
} from '../../lib/report/recipe-print-selection.js';

const menus = [
  { id: 'p1', kind: 'pizza', categoryLabel: '피자', menuName: '불고기피자' },
  { id: 'p2', kind: 'pizza', categoryLabel: '피자', menuName: '치즈피자' },
  { id: 's1', kind: 'side', categoryLabel: '사이드', menuName: '감자튀김' },
];

describe('recipe-print-selection', () => {
  test('isRecipeMenuSelected — 빈 selection은 전체 선택, false만 제외', () => {
    expect(isRecipeMenuSelected({}, 'p1')).toBe(true);
    expect(isRecipeMenuSelected({ p1: false }, 'p1')).toBe(false);
    expect(isRecipeMenuSelected({ p1: false }, 'p2')).toBe(true);
    expect(isRecipeMenuSelected(undefined, 'p1')).toBe(true);
  });

  test('isRecipeKindEnabled — cats.edge를 꺼도 레시피 출력엔 영향 없음(엣지는 kind가 아니므로 무관)', () => {
    expect(isRecipeKindEnabled({ edge: false, side: true }, 'pizza')).toBe(true);
    expect(isRecipeKindEnabled({ side: false }, 'side')).toBe(false);
    expect(isRecipeKindEnabled(undefined, 'side')).toBe(true);
  });

  test('filterRecipePrintMenus — cats.side=false면 사이드 메뉴만 빠진다', () => {
    const filtered = filterRecipePrintMenus(menus, { cats: { side: false } });
    expect(filtered.map(m => m.id)).toEqual(['p1', 'p2']);
  });

  test('filterRecipePrintMenus — recipeSelection으로 개별 메뉴 제외', () => {
    const filtered = filterRecipePrintMenus(menus, { recipeSelection: { p2: false } });
    expect(filtered.map(m => m.id)).toEqual(['p1', 's1']);
  });

  test('filterRecipePrintRows — 같은 메뉴의 L/R 행이 함께 빠진다(부모 id 기준)', () => {
    const rows = [
      { menuCode: 'P-001-L', categoryLabel: '피자', menuName: '불고기피자', kind: 'pizza' },
      { menuCode: 'P-001-R', categoryLabel: '피자', menuName: '불고기피자', kind: 'pizza' },
      { menuCode: 'S-001', categoryLabel: '사이드', menuName: '감자튀김', kind: 'side' },
    ];
    const filtered = filterRecipePrintRows(rows, {
      recipeSelection: { '피자|name:불고기피자': false },
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].menuCode).toBe('S-001');
  });

  test('buildRecipePrintSections — kind 순서(pizza→personal→set→side→topping), pagePerMenu는 피자/1인피자만', () => {
    const sections = buildRecipePrintSections(menus, { pagePerMenu: true });
    expect(sections.map(s => s.kind)).toEqual(['pizza', 'side']);
    expect(sections.find(s => s.kind === 'pizza').pagePerMenu).toBe(true);
    expect(sections.find(s => s.kind === 'side').pagePerMenu).toBe(false);
  });

  test('buildRecipePrintSections — pagePerMenu:false면 전부 false', () => {
    const sections = buildRecipePrintSections(menus, { pagePerMenu: false });
    expect(sections.every(s => s.pagePerMenu === false)).toBe(true);
  });

  test('RECIPE_PAGE_PER_MENU_KINDS는 피자/1인피자만 포함한다', () => {
    expect(RECIPE_PAGE_PER_MENU_KINDS.has('pizza')).toBe(true);
    expect(RECIPE_PAGE_PER_MENU_KINDS.has('personal')).toBe(true);
    expect(RECIPE_PAGE_PER_MENU_KINDS.has('side')).toBe(false);
  });

  test('buildRecipeMenuGroups — 카테고리별 선택 개수를 계산한다', () => {
    const groups = buildRecipeMenuGroups(menus, { p2: false });
    const pizzaGroup = groups.find(g => g.kind === 'pizza');
    expect(pizzaGroup.total).toBe(2);
    expect(pizzaGroup.selectedCount).toBe(1);
  });

  test('pruneRecipeSelection — true 값은 지우고 false만 남긴다', () => {
    expect(pruneRecipeSelection({ p1: true, p2: false, p3: true })).toEqual({ p2: false });
    expect(pruneRecipeSelection(undefined)).toEqual({});
  });
});
