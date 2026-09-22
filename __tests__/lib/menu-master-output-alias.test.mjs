/**
 * 출력 대표 메뉴 연결(menu_master.outputMenuCode) — 같은 메뉴인데 매장마다 재료(면)만 다른
 * 변형 행을 영양성분표·알레르기·원산지 출력에서 대표 메뉴 한 행으로 합친다 (2026-09-22).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  buildOutputAliasMap,
  dropOutputVariants,
  foldIngredientToMenus,
  resolveOutputMenuCode,
} from '../../lib/menu-master/output-alias.js';
import { applyOutputAliasesToLabelInputs } from '../../lib/nutrition/label/context.js';
import { buildNutritionLinkedMenuCodeSetFrom } from '../../lib/menu-master/readiness-nutrition.js';

const masters = [
  { menuCode: 'S-SPG-002', menuName: '오븐 스파게티', category: '사이드' },
  {
    menuCode: 'S-SPG-002-1',
    menuName: '오븐 스파게티 (건면)',
    category: '사이드',
    outputMenuCode: 'S-SPG-002',
  },
  { menuCode: 'S-CHK-003', menuName: '핫윙', category: '사이드', outputMenuCode: 'S-CHK-003' },
  { menuCode: 'S-XXX', menuName: '고아', category: '사이드', outputMenuCode: 'NOPE' },
];

describe('buildOutputAliasMap', () => {
  test('outputMenuCode가 있는 변형만 대표 메뉴로 매핑하고, 자기 자신·없는 코드는 무시한다', () => {
    const map = buildOutputAliasMap(masters);
    expect([...map.keys()]).toEqual(['S-SPG-002-1']);
    expect(map.get('S-SPG-002-1')).toMatchObject({
      menuCode: 'S-SPG-002',
      menuName: '오븐 스파게티',
    });
    expect(resolveOutputMenuCode('S-SPG-002-1', map)).toBe('S-SPG-002');
    expect(resolveOutputMenuCode('S-CHK-003', map)).toBe('S-CHK-003');
    expect(dropOutputVariants(masters, map).map(m => m.menuCode)).toEqual([
      'S-SPG-002',
      'S-CHK-003',
      'S-XXX',
    ]);
  });
});

describe('foldIngredientToMenus', () => {
  test('변형 코드의 재료 연결을 대표 메뉴로 접는다(알레르기·원산지 합집합의 근거)', () => {
    const map = buildOutputAliasMap(masters);
    const ingredientToMenus = new Map([
      [
        'code:CC310576',
        new Map([['S-SPG-002', { menuName: '오븐 스파게티', category: '사이드' }]]),
      ],
      [
        'code:CC110612',
        new Map([['S-SPG-002-1', { menuName: '오븐 스파게티 (건면)', category: '사이드' }]]),
      ],
    ]);
    const folded = foldIngredientToMenus(ingredientToMenus, map);
    expect([...folded.get('code:CC110612').keys()]).toEqual(['S-SPG-002']);
    expect(folded.get('code:CC110612').get('S-SPG-002')).toMatchObject({
      menuName: '오븐 스파게티',
    });
    expect([...folded.get('code:CC310576').keys()]).toEqual(['S-SPG-002']);
    // 연결이 없으면 원본 그대로
    expect(foldIngredientToMenus(ingredientToMenus, new Map())).toBe(ingredientToMenus);
  });
});

describe('applyOutputAliasesToLabelInputs (영양성분표)', () => {
  test('변형 코드의 영양 메뉴·값을 대표 코드로 옮기고, 대표가 이미 있으면 하나만 남긴다', () => {
    const map = buildOutputAliasMap(masters);
    const { menuRefs, rawMap } = applyOutputAliasesToLabelInputs({
      menuRefs: [
        { menuCode: 'S-SPG-002-1', menuName: '오븐 스파게티 (건면)', category: '사이드' },
        { menuCode: 'S-CHK-003', menuName: '핫윙', category: '사이드' },
      ],
      rawMap: { 'S-SPG-002-1__석쇠L': { menuCode: 'S-SPG-002-1', weight: 432, kcal: 627 } },
      aliasMap: map,
    });
    expect(menuRefs.map(r => [r.menuCode, r.menuName])).toEqual([
      ['S-CHK-003', '핫윙'],
      ['S-SPG-002', '오븐 스파게티'],
    ]);
    expect(rawMap['S-SPG-002__석쇠L']).toMatchObject({ menuCode: 'S-SPG-002', kcal: 627 });
    expect(rawMap['S-SPG-002-1__석쇠L']).toBeDefined();

    // 대표와 변형 둘 다 영양 메뉴에 있으면 대표 행 하나만
    const both = applyOutputAliasesToLabelInputs({
      menuRefs: [
        { menuCode: 'S-SPG-002-1', menuName: '오븐 스파게티 (건면)' },
        { menuCode: 'S-SPG-002', menuName: '오븐 스파게티' },
      ],
      rawMap: {},
      aliasMap: map,
    });
    expect(both.menuRefs.map(r => r.menuCode)).toEqual(['S-SPG-002']);
  });
});

describe('영양 연동 판정도 연결을 따른다', () => {
  test('변형에만 값이 있어도 대표 메뉴가 연동으로 잡힌다(반대도 같음)', () => {
    const linked = buildNutritionLinkedMenuCodeSetFrom({
      rawValues: [{ menuCode: 'S-SPG-002-1' }],
      toppings: [],
      nutritionEdges: [],
      menuMasters: masters,
    });
    expect(linked.has('S-SPG-002')).toBe(true);
    expect(linked.has('S-SPG-002-1')).toBe(true);
  });
});

describe('출력 화면들이 연결을 적용한다 (소스 기준)', () => {
  const src = f => readFileSync(resolve(f), 'utf8');
  test('라벨 컨텍스트·원산지·알레르기 페이지가 foldIngredientToMenus를 쓰고, 메뉴마스터가 필드를 저장한다', () => {
    expect(src('lib/nutrition/label/context.js')).toContain(
      'foldIngredientToMenus(rawIngredientToMenus, aliasMap)'
    );
    expect(src('app/nutrition/export/OriginResult.jsx')).toContain('foldIngredientToMenus(');
    expect(src('app/nutrition/export/NutritionLabelResult.jsx')).toContain(
      'foldIngredientToMenus('
    );
    expect(src('app/nutrition/origin/page.jsx')).toContain('foldIngredientToMenus(');
    expect(src('app/nutrition/allergen/useAllergenSourceData.js')).toContain('dropOutputVariants(');
    expect(src('lib/menu-master/store.js')).toContain(
      'rec.outputMenuCode = target && target !== code ? target : undefined;'
    );
    expect(src('components/menu-master/MenuMasterEditModal.jsx')).toContain(
      'outputMenuCode: form.outputMenuCode,'
    );
    expect(src('components/menu-master/MenuMasterEditFields.jsx')).toContain(
      '<OutputMenuLinkField'
    );
  });
});
