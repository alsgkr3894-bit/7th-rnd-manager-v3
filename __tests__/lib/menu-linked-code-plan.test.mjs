import { describe, expect, test } from '@jest/globals';
import {
  LINKED_MENU_CODE_STORE_POLICY,
  LINKED_STORE_LABELS,
  findMenuCodeConflict,
  formatMenuCodeCascadeSummary,
  hasSiblingSharingBase,
  shouldMoveNutritionBase,
  sourceCodeFor,
  targetCodeFor,
} from '../../lib/menu-master/linked-code-plan.js';

describe('LINKED_MENU_CODE_STORE_POLICY', () => {
  test('store별 정책이 지정한 대로다', () => {
    expect(LINKED_MENU_CODE_STORE_POLICY.cost_selling_prices).toBe('full');
    expect(LINKED_MENU_CODE_STORE_POLICY.menu_recipes).toBe('full');
    expect(LINKED_MENU_CODE_STORE_POLICY.menu_recipe_versions).toBe('history');
    expect(LINKED_MENU_CODE_STORE_POLICY.nutrition_menu_ref).toBe('base');
    expect(LINKED_MENU_CODE_STORE_POLICY.nutrition_raw_values).toBe('base');
  });
});

describe('hasSiblingSharingBase', () => {
  const menuL = { id: 100, menuCode: 'P-OR-005-L', size: 'L' };
  const menuR = { id: 101, menuCode: 'P-OR-005-R', size: 'R' };

  test('같은 base를 쓰는 다른 행이 있으면 true', () => {
    expect(hasSiblingSharingBase(menuL, [menuL, menuR])).toBe(true);
  });

  test('자기 자신만 있으면 false', () => {
    expect(hasSiblingSharingBase(menuL, [menuL])).toBe(false);
  });

  test('menuCode가 없으면 false', () => {
    expect(hasSiblingSharingBase({ id: 1 }, [])).toBe(false);
  });
});

describe('shouldMoveNutritionBase', () => {
  const menuL = { id: 100, menuCode: 'P-OR-005-L', size: 'L' };
  const menuR = { id: 101, menuCode: 'P-OR-005-R', size: 'R' };

  test('base가 안 바뀌면 옮기지 않는다', () => {
    expect(shouldMoveNutritionBase(menuL, menuL, [menuL, menuR])).toBe(false);
  });

  test('base가 바뀌었지만 형제가 아직 옛 base를 쓰면 옮기지 않는다', () => {
    const next = { id: 100, menuCode: 'P-PS-005-L', size: 'L' };
    expect(shouldMoveNutritionBase(menuL, next, [menuL, menuR])).toBe(false);
  });

  test('base가 바뀌었고 형제가 없으면(또는 이미 같이 옮겨졌으면) 옮긴다', () => {
    const next = { id: 100, menuCode: 'P-PS-005-L', size: 'L' };
    expect(shouldMoveNutritionBase(menuL, next, [menuL])).toBe(true);
    const menuRMoved = { id: 101, menuCode: 'P-PS-005-R', size: 'R' };
    expect(shouldMoveNutritionBase(menuL, next, [menuL, menuRMoved])).toBe(true);
  });
});

describe('sourceCodeFor / targetCodeFor', () => {
  const codes = {
    fromFull: 'P-OR-005-L',
    toFull: 'P-PS-005-L',
    fromBase: 'P-OR-005',
    toBase: 'P-PS-005',
  };

  test('full/history 정책은 full 코드를 쓴다', () => {
    expect(sourceCodeFor('cost_selling_prices', codes)).toBe('P-OR-005-L');
    expect(targetCodeFor('cost_selling_prices', codes)).toBe('P-PS-005-L');
    expect(sourceCodeFor('menu_recipe_versions', codes)).toBe('P-OR-005-L');
  });

  test('base 정책은 base 코드를 쓴다', () => {
    expect(sourceCodeFor('nutrition_menu_ref', codes)).toBe('P-OR-005');
    expect(targetCodeFor('nutrition_raw_values', codes)).toBe('P-PS-005');
  });
});

describe('formatMenuCodeCascadeSummary', () => {
  test('cascade가 없으면 기본 문구', () => {
    expect(formatMenuCodeCascadeSummary(null)).toBe('저장 완료');
  });

  test('이동 건수를 라벨과 함께 나열한다', () => {
    const msg = formatMenuCodeCascadeSummary({
      from: 'P-OR-005-L',
      to: 'P-PS-005-L',
      updated: { cost_selling_prices: 1, menu_recipes: 1, menu_recipe_versions: 3 },
    });
    expect(msg).toBe(
      '메뉴코드 P-OR-005-L → P-PS-005-L 변경: 판매가 1건·메뉴 레시피 1건·레시피 이력 3건 이동'
    );
  });

  test('형제 때문에 영양성분을 유지했으면 안내를 덧붙인다', () => {
    const msg = formatMenuCodeCascadeSummary({
      from: 'P-OR-005-L',
      to: 'P-PS-005-L',
      updated: { cost_selling_prices: 1 },
      skipped: { nutrition: 'sibling' },
    });
    expect(msg).toBe(
      '메뉴코드 P-OR-005-L → P-PS-005-L 변경: 판매가 1건 이동 · 영양성분은 다른 규격이 같은 코드를 써서 유지'
    );
  });

  test('이동 건수가 없어도 코드 변경 자체는 알려준다', () => {
    const msg = formatMenuCodeCascadeSummary({ from: 'A', to: 'B', updated: {} });
    expect(msg).toBe('메뉴코드 A → B 변경');
  });
});

describe('findMenuCodeConflict', () => {
  const rows = [
    { id: 1, menuCode: 'P-001' },
    { id: 2, menuCode: 'P-002' },
  ];

  test('같은 코드를 쓰는 다른 행을 찾는다', () => {
    expect(findMenuCodeConflict(rows, 'P-002', 1)).toMatchObject({ id: 2 });
  });

  test('자기 자신은 충돌로 보지 않는다', () => {
    expect(findMenuCodeConflict(rows, 'P-001', 1)).toBeNull();
  });

  test('빈 코드는 충돌 없음', () => {
    expect(findMenuCodeConflict(rows, '', 1)).toBeNull();
  });
});

describe('LINKED_STORE_LABELS', () => {
  test('모든 정책 키에 라벨이 있다', () => {
    for (const storeName of Object.keys(LINKED_MENU_CODE_STORE_POLICY)) {
      expect(LINKED_STORE_LABELS[storeName]).toBeTruthy();
    }
  });
});
