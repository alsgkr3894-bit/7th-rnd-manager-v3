import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { buildToppingImportPlan } from '../../lib/menu-master/topping-import.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('buildToppingImportPlan', () => {
  test('영양 토핑 마스터의 이름으로 추가토핑 메뉴 초안을 만든다', () => {
    const toppings = [
      { toppingCode: 'CHZ', toppingName: '치즈 추가' },
      { toppingCode: 'PIN', toppingName: '파인애플 추가' },
    ];
    const plan = buildToppingImportPlan(toppings, []);
    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({
      menuName: '치즈 추가',
      category: '추가토핑',
      size: '단일',
      status: 'active',
      price: null,
    });
    expect(plan[0].menuCode).toMatch(/^T-ETC-\d{3}$/);
    expect(plan[1].menuCode).not.toBe(plan[0].menuCode);
  });

  test('이미 메뉴마스터에 추가토핑으로 등록된 이름은 건너뛴다(멱등)', () => {
    const toppings = [{ toppingName: '치즈 추가' }, { toppingName: '올리브 추가' }];
    const existingMenus = [{ menuCode: 'T-ETC-001', menuName: '치즈 추가', category: '추가토핑' }];
    const plan = buildToppingImportPlan(toppings, existingMenus);
    expect(plan).toHaveLength(1);
    expect(plan[0].menuName).toBe('올리브 추가');
  });

  test('같은 이름의 토핑이 중복 등록되어 있어도 한 번만 가져온다', () => {
    const toppings = [{ toppingName: '치즈 추가' }, { toppingName: '치즈 추가' }];
    const plan = buildToppingImportPlan(toppings, []);
    expect(plan).toHaveLength(1);
  });

  test('이름이 없는 토핑은 제외한다', () => {
    const toppings = [{ toppingCode: 'X' }, { toppingName: '' }];
    expect(buildToppingImportPlan(toppings, [])).toHaveLength(0);
  });

  test('기존 메뉴마스터의 T-ETC 코드 다음 번호부터 이어서 생성한다(코드 충돌 방지)', () => {
    const existingMenus = [{ menuCode: 'T-ETC-003', menuName: '기존토핑', category: '추가토핑' }];
    const plan = buildToppingImportPlan([{ toppingName: '새토핑' }], existingMenus);
    expect(plan[0].menuCode).toBe('T-ETC-004');
  });

  test('toppingName이 없으면 ingredientName으로 대체한다', () => {
    const plan = buildToppingImportPlan([{ ingredientName: '체다치즈' }], []);
    expect(plan[0].menuName).toBe('체다치즈');
  });
});

describe('추가토핑 카테고리가 메뉴마스터·원가 파이프라인에 배선돼 있다', () => {
  test('recipeStoreKindForCategory가 추가토핑을 topping으로 라우팅한다', () => {
    const s = src('lib/recipe-master/sync.js');
    expect(s).toContain('isExtraToppingCategory');
    expect(s).toContain("if (isExtraToppingCategory(category)) return 'topping';");
  });

  test('메뉴코드 T-{SUB}-{NNN} 체계가 파싱·생성 양쪽에 등록돼 있다', () => {
    const codeSrc = src('lib/cost/menu-price/code.js');
    expect(codeSrc).toContain("if (parts[0] === 'T') {");
    expect(codeSrc).toContain("추가토핑: 'T-ETC',");

    const rankSrc = src('lib/menu-categories.js');
    expect(rankSrc).toContain("if (seg0 === 'T') return 11;");
  });

  test('메뉴마스터 카테고리 프리셋·원가마진표 섹션에 추가토핑이 있다', () => {
    const pageSrc = src('app/menu-master/page.jsx');
    expect(pageSrc).toContain('MENU_CATEGORY.EXTRA_TOPPING');

    const marginSrc = src('app/cost/margin/marginTableSections.js');
    expect(marginSrc).toContain(
      "{ id: 'topping', title: '추가토핑', sizeMode: 'single', matches: cat => cat === '추가토핑' }"
    );
    expect(marginSrc).toContain("'추가토핑'");
  });

  test('메뉴마스터 헤더에 추가토핑 가져오기 버튼이 있다', () => {
    const s = src('components/menu-master/MenuMasterHeaderActions.jsx');
    expect(s).toContain('onImportToppings');
    expect(s).toContain('추가토핑 가져오기');
  });
});
