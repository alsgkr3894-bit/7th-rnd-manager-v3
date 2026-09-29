/**
 * 엣지 관리에서 구성품을 넣을 때 식자재 단가 자동 입력 (2026-09-29 주임님).
 * 실데이터: 골드스윗 엣지의 해남고구마무스는 제품코드가 없는 수동 식자재(id 152, 10,450원/1kg)인데
 * 엣지 화면이 제품코드로만 단가를 찾아 손으로 입력한 11원이 남아 있었다(실제 최신 단가 10.5원/g = 10,450원÷1kg, 앱의 소수 1자리 단가 정책).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { buildUnitPriceMap } from '../../lib/recipe/index.js';
import {
  edgePatchForIngredient,
  refreshEdgeComponentPrices,
} from '../../lib/cost/edge-dough/price-sync.js';
import { ingredientPriceKey } from '../../lib/cost/shared/ingredient-price-key.js';

// 실제 식자재 관리 모양: 코드 있는 것(제때 단가) + 코드 없는 수동 식자재(priceOverride)
const allMeta = [
  {
    id: 31,
    ingredientName: '고구마무스',
    productCode: 'CC410241',
    baseQuantity: 1000,
    baseUnitType: 'g',
  },
  {
    id: 152,
    ingredientName: '해남고구마무스',
    productCode: null,
    baseQuantity: 1000,
    baseUnitType: 'g',
    priceOverride: 10450,
  },
  {
    id: 60,
    ingredientName: '체다치즈',
    productCode: 'CC310582',
    baseQuantity: 1000,
    baseUnitType: 'g',
  },
  {
    id: 90,
    ingredientName: '단종재료',
    productCode: null,
    baseQuantity: 1000,
    baseUnitType: 'g',
    priceOverride: 5000,
    discontinued: true,
  },
  {
    id: 91,
    ingredientName: '중복이름',
    productCode: null,
    baseQuantity: 1000,
    baseUnitType: 'g',
    priceOverride: 1000,
  },
  {
    id: 92,
    ingredientName: '중복 이름',
    productCode: null,
    baseQuantity: 1000,
    baseUnitType: 'g',
    priceOverride: 2000,
  },
];
const priceRows = new Map([['CC310582', { productCode: 'CC310582', priceWithTax: 11800 }]]);
const upm = buildUnitPriceMap(allMeta, priceRows);

describe('ingredientPriceKey', () => {
  test('제품코드가 있으면 제품코드, 없으면 id (unitPriceMap 키와 같다)', () => {
    expect(ingredientPriceKey(allMeta[0])).toBe('CC410241');
    expect(ingredientPriceKey(allMeta[1])).toBe('152');
    expect(ingredientPriceKey({})).toBe('');
    for (const meta of allMeta) expect(upm.has(ingredientPriceKey(meta))).toBe(true);
  });
});

describe('edgePatchForIngredient — 식자재를 고를 때', () => {
  test('제품코드 없는 수동 식자재도 최신 단가를 가져오고 id 키로 연결한다', () => {
    const patch = edgePatchForIngredient(allMeta[1], upm);
    expect(patch).toMatchObject({
      ingredientName: '해남고구마무스',
      productCode: '152',
      unit: 'g',
    });
    expect(Number(patch.unitPrice)).toBeCloseTo(10.5, 6);
  });

  test('제품코드 식자재는 종전대로 제때 단가를 가져온다', () => {
    const patch = edgePatchForIngredient(allMeta[2], upm);
    expect(patch.productCode).toBe('CC310582');
    expect(Number(patch.unitPrice)).toBeCloseTo(11.8, 6);
  });

  test('단가를 못 찾으면 unitPrice를 건드리지 않는다(빈 값 유지)', () => {
    const patch = edgePatchForIngredient(allMeta[0], upm); // 제때 단가 없음
    expect(patch).not.toHaveProperty('unitPrice');
    expect(patch.productCode).toBe('CC410241');
  });
});

describe('refreshEdgeComponentPrices — 편집 화면을 열 때', () => {
  const stored = [
    { ingredientName: '해남고구마무스', productCode: null, quantity: 90, unit: 'g', unitPrice: 11 },
    {
      ingredientName: '체다치즈',
      productCode: 'CC310582',
      quantity: 100,
      unit: 'g',
      unitPrice: 11.8,
    },
    { ingredientName: '까망베르', productCode: 'ZZZ', quantity: -35, unit: 'g', unitPrice: 10.9 },
  ];

  test('코드 없는 옛 구성품은 이름으로 식자재에 연결하고 최신 단가로 바꾼다 (실데이터 11 → 10.5)', () => {
    const { components, changed } = refreshEdgeComponentPrices(stored, allMeta, upm);
    expect(changed).toBe(1);
    expect(components[0].productCode).toBe('152');
    expect(components[0].unitPrice).toBeCloseTo(10.5, 6);
    // 이후 다른 화면의 원가 계산도 이 키로 최신 단가를 따라간다
    expect(upm.get(components[0].productCode).unitPrice).toBeCloseTo(10.5, 6);
  });

  test('이미 최신인 구성품은 그대로(같은 객체), 단가를 못 찾는 구성품은 저장값을 지우지 않는다', () => {
    const { components } = refreshEdgeComponentPrices(stored, allMeta, upm);
    expect(components[1]).toBe(stored[1]);
    expect(components[2]).toBe(stored[2]);
    expect(components[2].unitPrice).toBe(10.9);
  });

  test('수량·단위·메모 등 다른 필드는 그대로', () => {
    const { components } = refreshEdgeComponentPrices(stored, allMeta, upm);
    expect(components[0]).toMatchObject({
      quantity: 90,
      unit: 'g',
      ingredientName: '해남고구마무스',
    });
  });

  test('이름이 겹치거나(모호) 단종된 식자재로는 연결하지 않는다', () => {
    const rows = [
      { ingredientName: '중복이름', productCode: null, quantity: 1, unit: 'g', unitPrice: 7 },
      { ingredientName: '단종재료', productCode: null, quantity: 1, unit: 'g', unitPrice: 7 },
    ];
    const { components, changed } = refreshEdgeComponentPrices(rows, allMeta, upm);
    expect(changed).toBe(0);
    expect(components[0].unitPrice).toBe(7);
    expect(components[1].productCode).toBeNull();
  });

  test('입력이 비어 있어도 던지지 않는다', () => {
    expect(refreshEdgeComponentPrices(undefined, undefined, undefined)).toEqual({
      components: [],
      changed: 0,
    });
  });
});

describe('편집 화면 연결', () => {
  const src = f => readFileSync(resolve(f), 'utf8');
  test('행은 헬퍼로 단가를 채우고, 모달은 열 때 기존 구성품을 갱신한다', () => {
    expect(src('components/cost/edge-dough/EdgeComponentRow.jsx')).toContain(
      'onChange(edgePatchForIngredient(meta, unitPriceMap))'
    );
    expect(src('components/cost/edge-dough/EdgeComponentRow.jsx')).not.toContain(
      'unitPriceMap.get(meta.productCode)'
    );
    expect(src('components/cost/edge-dough/EdgeEditModal.jsx')).toContain(
      'refreshEdgeComponentPrices(compsRef.current, meta, nextUpm)'
    );
    expect(src('components/cost/edge-dough/EdgeComponentsSection.jsx')).toContain('refreshedCount');
  });
});
