import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { diffRecipeVersions } from '../../lib/menu-master/recipe-versions.js';
import { DB_VERSION, ALL_STORES } from '../../lib/db/constants.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('menu_recipe_versions 스키마 배선', () => {
  test('ALL_STORES에 menu_recipe_versions가 있다', () => {
    expect(ALL_STORES).toContain('menu_recipe_versions');
  });

  test('DB_VERSION이 27 이상이다(신규 store 추가)', () => {
    expect(DB_VERSION).toBeGreaterThanOrEqual(27);
  });

  test('schema/menu-master.js가 menu_recipe_versions store를 만든다', () => {
    const s = src('lib/db/schema/menu-master.js');
    expect(s).toContain("createObjectStore('menu_recipe_versions'");
    expect(s).toContain("createIndex('menuCode'");
    expect(s).toContain("createIndex('at'");
  });

  test('cost 백업 그룹에 menu_recipe_versions가 포함된다(menu_recipes와 함께)', () => {
    const s = src('lib/db/module-stores.js');
    const costGroupStart = s.indexOf('cost: {');
    const costGroupBody = s.slice(costGroupStart, costGroupStart + 400);
    expect(costGroupBody).toContain('menu_recipes');
    expect(costGroupBody).toContain('menu_recipe_versions');
  });
});

describe('diffRecipeVersions', () => {
  test('추가/삭제/변경된 구성품을 구분한다', () => {
    const before = {
      totalCost: 1000,
      components: [
        { productCode: 'A', ingredientName: '치즈', quantity: 10, unitPrice: 50 },
        { productCode: 'B', ingredientName: '도우', quantity: 1, unitPrice: 500 },
      ],
    };
    const after = {
      totalCost: 1200,
      components: [
        { productCode: 'A', ingredientName: '치즈', quantity: 15, unitPrice: 50 }, // 수량 변경
        { productCode: 'C', ingredientName: '토마토소스', quantity: 1, unitPrice: 100 }, // 추가
        // B(도우)는 삭제됨
      ],
    };
    const diff = diffRecipeVersions(before, after);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].ingredientName).toBe('토마토소스');
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].ingredientName).toBe('도우');
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].label).toBe('치즈');
    expect(diff.changed[0].before.quantity).toBe(10);
    expect(diff.changed[0].after.quantity).toBe(15);
    expect(diff.costDelta).toBe(200);
  });

  test('구성품이 완전히 같으면 변경 없음으로 판정한다', () => {
    const same = {
      totalCost: 500,
      components: [{ productCode: 'A', ingredientName: '치즈', quantity: 10, unitPrice: 50 }],
    };
    const diff = diffRecipeVersions(same, same);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.costDelta).toBe(0);
  });

  test('원가 정보가 없으면 costDelta는 null이다', () => {
    const diff = diffRecipeVersions({ components: [] }, { components: [] });
    expect(diff.costDelta).toBeNull();
  });
});

describe('레시피 저장 시 버전 스냅샷을 남긴다', () => {
  test('useMenuRecipeEditor.handleSave가 saveRecipeVersionSnapshot을 호출한다', () => {
    const s = src('components/menu-master/useMenuRecipeEditor.js');
    expect(s).toContain("from '@/lib/menu-master/recipe-versions'");
    expect(s).toContain('saveRecipeVersionSnapshot({');
    // 부수 기록이라 실패해도 저장 자체를 막지 않는다 — throw 대신 catch로 삼킨다
    expect(s).toMatch(/saveRecipeVersionSnapshot\(\{[\s\S]*?\}\)\.catch/);
  });

  test('MenuRecipeSection이 변경 이력 UI를 렌더한다', () => {
    const s = src('components/menu-master/MenuRecipeSection.jsx');
    expect(s).toContain('MenuRecipeVersionHistory');
    expect(s).toContain('currentTotalCost={recipeSummary?.totalCost}');
  });
});
