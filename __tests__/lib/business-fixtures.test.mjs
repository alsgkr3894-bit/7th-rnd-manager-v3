import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';
import XLSX from 'xlsx';
import { readCsvFile, readExcelFile } from '../../lib/excel.js';
import { validateSalesFile } from '../../lib/sales/parse.js';
import { classifyAndPrepare } from '../../lib/sales/classify.js';
import { parsePriceRows } from '../../lib/price/parse.js';
import { parseMenuPriceRows } from '../../lib/cost/menu-price/parse.js';
import { buildPizzaSummary } from '../../lib/cost/pizza-summary/calc.js';

function readFixture(name) {
  const text = readFileSync(new URL(`../fixtures/business/${name}`, import.meta.url), 'utf8');
  return readCsvFile(text);
}

function workbookBuffer(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, '업무 fixture');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
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

  test('판매량 fixture는 실제 xlsx workbook으로 읽어도 같은 검증을 통과한다', async () => {
    const fixture = readFixture('sales-valid.csv');
    const parsed = await readExcelFile(workbookBuffer(fixture.rawRows));
    const result = validateSalesFile(parsed.rawRows);

    expect(parsed.sheetName).toBe('업무 fixture');
    expect(result.success).toBe(true);
    expect(result.period).toEqual({ year: 2026, month: 5 });
    expect(result.summary).toEqual({ totalRows: 2, validCount: 2, invalidCount: 0 });
  });

  test('판매량 fixture의 필수 헤더 누락은 명확히 실패한다', () => {
    const fixture = readFixture('sales-missing-quantity.csv');
    const result = validateSalesFile(fixture.rawRows);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('필수 헤더');
  });

  test('판매량 fixture는 분류·제외·미매칭 이슈를 고정한다', () => {
    const rows = [
      { rawMenuName: '익명 콤비 별칭', quantity: 12, originalIndex: 1 },
      { rawMenuName: '익명 제외 메뉴', quantity: 2, originalIndex: 2 },
      { rawMenuName: '익명 신규 메뉴', quantity: 3, originalIndex: 3 },
    ];
    const classifier = {
      mapAlias: name => (name === '익명 콤비 별칭' ? '익명 콤비네이션' : name),
      matchRule: name =>
        name === '익명 콤비네이션'
          ? {
              category: '피자',
              groupName: '익명 피자',
              detailName: '익명 콤비네이션',
            }
          : null,
      isExcluded: name => name === '익명 제외 메뉴',
    };

    const result = classifyAndPrepare(rows, 2026, 5, classifier);

    expect(result.classifiedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawMenuName: '익명 콤비 별칭',
          mappedMenuName: '익명 콤비네이션',
          status: 'classified',
          category: '피자',
        }),
        expect.objectContaining({
          rawMenuName: '익명 제외 메뉴',
          status: 'excluded',
        }),
        expect.objectContaining({
          rawMenuName: '익명 신규 메뉴',
          status: 'unclassified',
        }),
      ])
    );
    expect(result.groupedIssues).toEqual([
      expect.objectContaining({
        issueType: 'unmatched',
        normalizedMenuName: '익명 신규 메뉴',
        totalQuantity: 3,
      }),
    ]);
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

  test('피자 종합 원가는 제품코드 최신 단가맵을 우선한다', () => {
    const menu = {
      menuCode: 'PZ-UNIT-L',
      menuName: '익명 단가 피자',
      size: 'L',
      price: 20000,
      category: '피자',
    };
    const recipeMap = new Map([
      [
        menu.menuCode,
        {
          components: [
            { productCode: 'BASE', ingredientName: '베이스', quantity: 100, unitPrice: 99 },
          ],
        },
      ],
    ]);
    const edges = [
      {
        edgeType: '치즈크러스트',
        size: 'L',
        components: [{ productCode: 'EDGE', ingredientName: '엣지', quantity: 10, unitPrice: 99 }],
      },
    ];
    const unitPriceMap = new Map([
      ['BASE', { unitPrice: 2, baseUnitType: 'g' }],
      ['EDGE', { unitPrice: 5, baseUnitType: 'g' }],
    ]);

    const summary = buildPizzaSummary({ menus: [menu], recipeMap, edges, unitPriceMap })[0];

    expect(summary.byVariant.석쇠.cost).toBe(200);
    expect(summary.byVariant.치즈크러스트.cost).toBe(250);
  });
});
