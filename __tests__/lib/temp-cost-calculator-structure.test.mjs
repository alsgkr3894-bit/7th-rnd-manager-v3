import { describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  calcTempCostSummary,
  createTempCostRow,
  filterTempCostIngredients,
  hasLinkedTempCostRows,
  parseTempCost,
  refreshLinkedTempCostRows,
  unitPriceFromIngredient,
} from '../../components/note/temp-cost/tempCostUtils.js';

const mainSource = readFileSync(resolve('components/note/TempCostCalculator.jsx'), 'utf8');
const searchSource = readFileSync(
  resolve('components/note/temp-cost/TempIngredientSearch.jsx'),
  'utf8'
);
const tableSource = readFileSync(
  resolve('components/note/temp-cost/TempCostRowsTable.jsx'),
  'utf8'
);
const summarySource = readFileSync(
  resolve('components/note/temp-cost/TempCostSummary.jsx'),
  'utf8'
);
const hookSource = readFileSync(
  resolve('components/note/temp-cost/useTempCostCalculator.js'),
  'utf8'
);
const utilsSource = readFileSync(resolve('components/note/temp-cost/tempCostUtils.js'), 'utf8');

describe('temp cost calculator structure', () => {
  test('TempCostCalculator delegates search, table, summary, and data hook responsibilities', () => {
    expect(mainSource).toContain('<TempIngredientSearch');
    expect(mainSource).toContain('<TempCostRowsTable');
    expect(mainSource).toContain('<TempCostSummary');
    expect(mainSource).toContain('useTempCostCalculator');
    expect(mainSource).not.toContain('getAllIngredients');
    expect(mainSource).not.toContain('calcUnitPrice');
    expect(mainSource).not.toContain('재료를 검색해서 추가하세요');
    expect(mainSource.split('\n').length).toBeLessThanOrEqual(80);

    expect(searchSource).toContain('export function TempIngredientSearch');
    expect(searchSource).toContain('function TempIngredientOption');
    expect(searchSource).toContain('연동값 갱신');
    expect(tableSource).toContain('export function TempCostRowsTable');
    expect(tableSource).toContain('function TempCostRow');
    expect(tableSource).toContain('tempCostRowSubtotal');
    expect(summarySource).toContain('export function TempCostSummary');
    expect(summarySource).toContain('tempCostRateColor');
    expect(hookSource).toContain('export function useTempCostCalculator');
    expect(hookSource).toContain('initDB');
    expect(hookSource).toContain('refreshLinkedTempCostRows');
    expect(utilsSource).toContain('export function parseTempCost');
    expect(utilsSource).toContain('export function filterTempCostIngredients');
  });

  test('temp cost helpers keep parsing, search, unit price, and refresh behavior stable', () => {
    expect(parseTempCost('')).toEqual({ rows: [], sellingPrice: '' });
    expect(parseTempCost('not json')).toEqual({ rows: [], sellingPrice: '' });
    expect(parseTempCost(JSON.stringify({ rows: [{ id: 1 }], sellingPrice: '12000' }))).toEqual({
      rows: [{ id: 1 }],
      sellingPrice: '12000',
    });

    const ingredients = [
      {
        id: 'ing-cheese',
        ingredientName: '모짜렐라 치즈',
        productCode: 'ING-001',
        baseUnitType: 'g',
        baseQuantity: 1000,
        priceWithTax: 12500,
      },
      { id: 'ing-sauce', productName: '토마토 소스', productCode: 'SAUCE-RED' },
    ];

    expect(filterTempCostIngredients(ingredients, '치즈').map(row => row.id)).toEqual([
      'ing-cheese',
    ]);
    expect(filterTempCostIngredients(ingredients, 'sauce').map(row => row.id)).toEqual([
      'ing-sauce',
    ]);
    expect(unitPriceFromIngredient(ingredients[0])).toBe('12.5');

    jest.spyOn(Date, 'now').mockReturnValue(123456);
    const firstRow = createTempCostRow(ingredients[0]);
    const secondRow = createTempCostRow(ingredients[0]);
    expect(firstRow).toMatchObject({
      ingredientId: 'ing-cheese',
      productCode: 'ING-001',
      name: '모짜렐라 치즈',
      unit: 'g',
      unitPrice: '12.5',
    });
    expect(String(firstRow.id)).toMatch(/^123456-\d+$/);
    expect(secondRow.id).not.toBe(firstRow.id);
    Date.now.mockRestore();

    const refreshed = refreshLinkedTempCostRows(
      [{ id: 'row-1', ingredientId: 'ing-cheese', quantity: '10', unitPrice: '1' }],
      ingredients
    );
    expect(refreshed[0]).toMatchObject({
      productCode: 'ING-001',
      name: '모짜렐라 치즈',
      unit: 'g',
      unitPrice: '12.5',
    });
    expect(hasLinkedTempCostRows(refreshed)).toBe(true);
    expect(calcTempCostSummary([{ quantity: '10', unitPrice: '12.5' }], '1000')).toEqual({
      totalCost: 125,
      costRate: 12.5,
    });
  });
});
