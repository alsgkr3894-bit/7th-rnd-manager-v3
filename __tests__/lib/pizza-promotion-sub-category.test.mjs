import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  getMenuSubCategoryFromCode,
  parseCategoryFromCode,
  updateMenuCodeSubCategory,
} from '../../lib/cost/menu-price/code.js';
import { SUB_TAG_STYLE } from '../../lib/ui/colors.js';
import { PIZZA_CATEGORY_VARIANTS, getMenuCodeRank } from '../../lib/menu-categories.js';
import { MENU_CATEGORIES } from '../../lib/recipe/index.js';
import { MENU_PRICE_CATEGORIES } from '../../lib/cost/menu-price/template.js';
import { emptyGroup } from '../../lib/cost/group-utils.js';

// 2026-10-02: 메뉴마스터에 P-PM-001~003-L(달콤한줄 피자)을 등록했는데 중분류가 'PM'으로만 보였다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('피자 중분류 PM = 프로모션', () => {
  test('메뉴코드 P-PM-…은 피자/프로모션으로 읽힌다', () => {
    expect(parseCategoryFromCode('P-PM-001-L')).toEqual({
      category: '피자/프로모션',
      subCategory: '프로모션',
    });
    expect(getMenuSubCategoryFromCode('P-PM-002-L')).toMatchObject({
      code: 'PM',
      label: '프로모션',
      category: '피자/프로모션',
    });
  });

  test('수정 화면에서 중분류를 PM으로 바꿀 수 있다', () => {
    expect(updateMenuCodeSubCategory('P-OR-005-L', 'PM')).toBe('P-PM-005-L');
  });

  test('분류 태그에 프로모션 칩이 붙는다', () => {
    expect(SUB_TAG_STYLE.PM?.label).toBe('프로모션');
  });

  test('피자 분류 목록 전부에 피자/프로모션이 들어 있다(원가·레시피가 피자로 계산되도록)', () => {
    expect(PIZZA_CATEGORY_VARIANTS).toContain('피자/프로모션');
    expect(MENU_CATEGORIES).toContain('피자/프로모션');
    expect(MENU_PRICE_CATEGORIES).toContain('피자/프로모션');
    expect(emptyGroup().defaultCategories).toContain('피자/프로모션');
    expect(read('lib/cost/margin/build-rows.js')).toContain("'피자/프로모션': pizzaMap");
  });

  test('정렬은 오리지널과 같은 자리(코드순으로 바로 뒤)', () => {
    expect(getMenuCodeRank('P-PM-001-L')).toBe(getMenuCodeRank('P-OR-001-L'));
  });

  test('메뉴마스터 중분류 필터가 코드(PM)만 적힌 행도 프로모션으로 거른다', () => {
    const src = read('hooks/useMenuMasterFilters.js');
    expect(src).toContain('getMenuSubCategoryFromCode(row?.menuCode)?.label ||');
  });
});
