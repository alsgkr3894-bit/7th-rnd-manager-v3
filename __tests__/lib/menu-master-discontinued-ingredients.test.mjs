import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  buildFlaggedIngredientMap,
  buildMenuRecipeSummaryMap,
  findFlaggedComponentNames,
} from '../../lib/menu-master/recipe-summary.js';
import { buildMenuDataQualityReport, QUALITY_KINDS } from '../../lib/menu-master/data-quality.js';
import { countMenusWithDiscontinuedIngredients } from '../../lib/menu-master/discontinued-ingredient-count.js';

// 2026-10-13 주임님 요청: 식자재 관리에서 단종 처리된 식자재가 메뉴 레시피에 들어 있으면
// 메뉴마스터에서 알림·표시등으로 알려 수정하게 한다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const ingredients = [
  { productCode: 'A001', ingredientName: '옛 베이컨', discontinued: true },
  { productCode: 'A002', ingredientName: '제외 소스', excluded: true },
  { productCode: 'A003', ingredientName: '현재 치즈' },
];
const flagged = buildFlaggedIngredientMap(ingredients);

const PIZZA = {
  menuCode: 'P-OR-001-L',
  menuName: '포크 피자 L',
  category: '피자/오리지널',
  status: 'active',
};
const recipeMaps = {
  pizza: new Map([
    [
      'P-OR-001-L',
      {
        components: [
          { productCode: 'a001', ingredientName: '옛 베이컨', quantity: 10, unit: 'g' },
          { productCode: 'A003', ingredientName: '현재 치즈', quantity: 20, unit: 'g' },
          { productCode: 'A002', ingredientName: '제외 소스', quantity: 5, unit: 'g' },
        ],
      },
    ],
  ]),
};

describe('단종 식자재 판정', () => {
  test('discontinued·excluded 식자재만 품목코드(대소문자 무시)로 모은다', () => {
    expect([...flagged.keys()].sort()).toEqual(['A001', 'A002']);
    expect(flagged.get('A001')).toBe('옛 베이컨');
  });

  test('구성품 중 단종 식자재 이름만 중복 없이 돌려준다', () => {
    const names = findFlaggedComponentNames(
      PIZZA,
      [{ productCode: 'a001' }, { productCode: 'A001' }, { productCode: 'A003' }, {}],
      flagged
    );
    expect(names).toEqual(['옛 베이컨']);
  });

  test('메뉴 자신이 단종이면 알리지 않는다', () => {
    expect(
      findFlaggedComponentNames(
        { ...PIZZA, status: 'discontinued' },
        [{ productCode: 'A001' }],
        flagged
      )
    ).toEqual([]);
  });

  test('단종 식자재 맵이 비어 있으면 아무것도 표시하지 않는다', () => {
    expect(findFlaggedComponentNames(PIZZA, [{ productCode: 'A001' }], new Map())).toEqual([]);
    expect(findFlaggedComponentNames(PIZZA, [{ productCode: 'A001' }], undefined)).toEqual([]);
  });
});

describe('레시피 요약·품질 점검·배너', () => {
  const summaryMap = buildMenuRecipeSummaryMap([PIZZA], recipeMaps, new Map(), {
    flaggedIngredients: flagged,
  });

  test('요약에 단종 식자재 이름이 실린다', () => {
    expect(summaryMap.get('P-OR-001-L').discontinuedIngredientNames).toEqual([
      '옛 베이컨',
      '제외 소스',
    ]);
  });

  test('품질 점검에 "단종 식자재" 진단이 메뉴마다 한 건 생긴다', () => {
    const report = buildMenuDataQualityReport([PIZZA], summaryMap, new Map());
    const issues = report.issues.filter(i => i.kind === QUALITY_KINDS.DISCONTINUED_INGREDIENT);
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('옛 베이컨, 제외 소스');
    expect(issues[0].label).toBe('단종 식자재');
  });

  test('경고 배너는 단종 식자재가 있는 메뉴 수를 센다', () => {
    expect(countMenusWithDiscontinuedIngredients([PIZZA], summaryMap)).toBe(1);
    expect(countMenusWithDiscontinuedIngredients([PIZZA], new Map())).toBe(0);
  });

  test('요약 계산 옵션이 없으면 기존 요약은 그대로(빈 목록)', () => {
    const plain = buildMenuRecipeSummaryMap([PIZZA], recipeMaps, new Map());
    expect(plain.get('P-OR-001-L').discontinuedIngredientNames).toEqual([]);
  });
});

describe('화면 연결', () => {
  test('요약 로더가 식자재를 읽어 단종 맵을 넘기고, 화면 4곳이 표시한다', () => {
    expect(read('lib/menu-master/recipe-summary.js')).toContain(
      'flaggedIngredients: buildFlaggedIngredientMap(ingredients)'
    );
    expect(read('components/menu-master/MenuRecipeCostCell.jsx')).toContain('단종 식자재');
    expect(read('app/menu-master/page.jsx')).toContain('<MenuDiscontinuedIngredientBanner');
    expect(read('components/menu-master/recipe/MenuRecipeTableRow.jsx')).toContain(
      '단종 처리된 식자재입니다'
    );
  });
});
