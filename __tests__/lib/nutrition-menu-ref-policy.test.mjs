import { describe, expect, test } from '@jest/globals';
import { buildNutritionMenuRefPayload } from '../../lib/nutrition/menu-ref-policy.js';

describe('nutrition menu ref policy', () => {
  test('메뉴마스터 menuCode가 없으면 영양 전용 메뉴를 만들지 않는다', () => {
    expect(() =>
      buildNutritionMenuRefPayload({
        menuCode: '',
        menuName: '수동 메뉴',
        category: '피자',
      })
    ).toThrow('메뉴마스터에서 메뉴를 선택하세요');
  });

  test('메뉴마스터 선택값으로 nutrition_menu_ref payload를 만든다', () => {
    expect(
      buildNutritionMenuRefPayload({
        menuCode: ' PZ-001 ',
        menuName: ' 테스트 피자 ',
        category: '피자/프리미엄',
        displayOrder: '7',
      })
    ).toEqual({
      menuCode: 'PZ-001',
      menuName: '테스트 피자',
      category: '피자',
      displayOrder: 7,
    });
  });
});
