import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';
import { readCsvFile } from '../../lib/excel.js';
import { validateSalesFile } from '../../lib/sales/parse.js';
import { parsePriceRows } from '../../lib/price/parse.js';
import { parseMenuPriceRows } from '../../lib/cost/menu-price/parse.js';
import { buildPizzaSummary } from '../../lib/cost/pizza-summary/calc.js';

function readFixture(name) {
  const text = readFileSync(new URL(`../fixtures/business/${name}`, import.meta.url), 'utf8');
  return readCsvFile(text);
}

describe('익명화 업무 fixture 회귀', () => {
  test('판매량 fixture는 월 기간과 정상 판매 행을 검증한다', () => {
    const fixture = readFixture('sales-valid.csv');
    const result = validateSalesFile(fixture.rawRows);

    expect(result.success).toBe(true);
    expect(result.period).toEqual({ year: 2026, month: 5 });
    expect(result.summary).toEqual({ totalRows: 2, validCount: 2, invalidCount: 0 });
    expect(result.validRows[0]).toMatchObject({
      rawMenuName: '익명 콤비네이션 피자',
      quantity: 12,
    });
  });

  test('판매량 fixture의 필수 헤더 누락은 명확히 실패한다', () => {
    const fixture = readFixture('sales-missing-quantity.csv');
    const result = validateSalesFile(fixture.rawRows);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('필수 헤더');
  });

  test('제때 단가 fixture는 과세/면세 단가를 정규화한다', () => {
    const fixture = readFixture('price-valid.csv');
    const result = parsePriceRows(fixture.headers, fixture.rows);

    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([]);
    expect(result.success).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productCode: 'ING-001',
          productName: '익명 치즈',
          taxType: '과세',
          price: 10000,
          priceWithTax: 11000,
        }),
        expect.objectContaining({
          productCode: 'ING-002',
          taxType: '면세',
          priceWithTax: 5000,
        }),
      ])
    );
  });

  test('제때 단가 fixture의 과세구분 누락은 업로드 전 실패한다', () => {
    const fixture = readFixture('price-missing-tax.csv');
    const result = parsePriceRows(fixture.headers, fixture.rows);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('taxType');
  });

  test('메뉴 판매가 fixture는 메뉴코드와 가격을 보존한다', () => {
    const fixture = readFixture('menu-price-valid.csv');
    const result = parseMenuPriceRows(fixture.headers, fixture.rows);

    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([]);
    expect(result.success).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          menuCode: 'PZ-001',
          menuName: '익명 콤비네이션 피자',
          price: 20000,
          size: 'L',
        }),
      ])
    );
  });

  test('원가 기준표 fixture는 피자 기본/엣지 원가와 원가율을 고정한다', () => {
    const fixture = readFixture('cost-basis.csv');
    const row = fixture.rows[0];
    const menu = {
      menuCode: row.menuCode,
      menuName: row.menuName,
      size: row.size,
      price: Number(row.price),
      category: '피자',
    };
    const recipeMap = new Map([
      [
        row.menuCode,
        {
          components: [
            {
              ingredientName: '익명 베이스',
              quantity: Number(row.baseQty),
              unitPrice: Number(row.baseUnitPrice),
            },
          ],
        },
      ],
    ]);
    const edges = [
      {
        edgeType: '치즈크러스트',
        size: row.size,
        components: [
          {
            ingredientName: '익명 엣지',
            quantity: Number(row.edgeQty),
            unitPrice: Number(row.edgeUnitPrice),
          },
        ],
      },
    ];

    const summary = buildPizzaSummary({ menus: [menu], recipeMap, edges })[0];

    expect(summary.byVariant.석쇠.cost).toBe(Number(row.expectedStoneCost));
    expect(summary.byVariant.석쇠.rate).toBe(Number(row.expectedStoneRate));
    expect(summary.byVariant.치즈크러스트.cost).toBe(Number(row.expectedCheeseCrustCost));
  });
});
