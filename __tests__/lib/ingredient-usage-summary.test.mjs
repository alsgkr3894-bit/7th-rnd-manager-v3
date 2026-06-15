import { describe, expect, test } from '@jest/globals';
import {
  buildIngredientUsageRows,
  ingredientUsageIdentity,
} from '../../lib/ingredient/usage-summary.js';

describe('ingredient usage summary', () => {
  test('제품코드와 식자재명으로 사용 메뉴를 합쳐 카테고리 순서로 반환한다', () => {
    const ingredientToMenus = new Map([
      [
        'code:ING-001',
        new Map([
          [
            'SIDE-001',
            {
              menuName: '치즈볼',
              category: '사이드',
              sources: [{ type: '직접', name: '상세 레시피' }],
            },
          ],
        ]),
      ],
      [
        'name:모짜렐라',
        new Map([
          [
            'PZ-001-L',
            {
              menuName: '슈퍼콤비네이션 L',
              category: '피자',
              sources: [
                { type: '직접', name: '상세 레시피' },
                { type: '직접', name: '상세 레시피' },
              ],
            },
          ],
        ]),
      ],
    ]);

    expect(
      buildIngredientUsageRows({
        ingredientToMenus,
        productCode: 'ING-001',
        ingredientName: '모짜렐라',
      })
    ).toEqual([
      {
        menuCode: 'PZ-001-L',
        menuName: '슈퍼콤비네이션 L',
        category: '피자',
        sources: [{ type: '직접', name: '상세 레시피', label: '직접: 상세 레시피' }],
      },
      {
        menuCode: 'SIDE-001',
        menuName: '치즈볼',
        category: '사이드',
        sources: [{ type: '직접', name: '상세 레시피', label: '직접: 상세 레시피' }],
      },
    ]);
  });

  test('식자재 표시 이름 fallback을 사용한다', () => {
    expect(ingredientUsageIdentity({ productCode: ' A ', displayName: ' 치즈 ' })).toEqual({
      productCode: 'A',
      ingredientName: '치즈',
    });
  });
});
