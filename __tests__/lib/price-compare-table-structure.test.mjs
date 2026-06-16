import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildPriceCompareCsvData,
  countPriceChangeStatuses,
  formatChangeAmount,
  formatChangeRate,
  formatPriceWon,
  getPriceCompareRowValues,
  priceChangeColor,
  priceCompareAlertStyle,
} from '../../components/jette/price-compare/priceCompareTableUtils.js';

const tableSource = readFileSync(resolve('components/jette/PriceCompareTable.jsx'), 'utf8');
const filtersSource = readFileSync(
  resolve('components/jette/price-compare/PriceCompareFilters.jsx'),
  'utf8'
);
const dataTableSource = readFileSync(
  resolve('components/jette/price-compare/PriceCompareDataTable.jsx'),
  'utf8'
);
const rowSource = readFileSync(resolve('components/jette/price-compare/PriceCompareRow.jsx'), 'utf8');
const statusSource = readFileSync(
  resolve('components/jette/price-compare/PriceCompareStatusChip.jsx'),
  'utf8'
);

describe('price compare table structure', () => {
  test('PriceCompareTable delegates filter, table, row, and status rendering', () => {
    expect(tableSource).toContain('<PriceCompareFilters');
    expect(tableSource).toContain('<PriceCompareDataTable');
    expect(tableSource).toContain('buildPriceCompareCsvData');
    expect(tableSource).toContain('countPriceChangeStatuses');
    expect(tableSource).not.toContain('<SortableTh');
    expect(tableSource).not.toContain('<Chip');
    expect(tableSource).not.toContain('function Row');
    expect(tableSource).not.toContain('function StatusChip');
    expect(tableSource.split('\n').length).toBeLessThanOrEqual(150);

    expect(filtersSource).toContain('export function PriceCompareFilters');
    expect(filtersSource).toContain('TYPE_FILTERS');
    expect(filtersSource).toContain('CHANGE_FILTERS');
    expect(dataTableSource).toContain('export function PriceCompareDataTable');
    expect(dataTableSource).toContain('<SortableTh');
    expect(dataTableSource).toContain('<PriceCompareRow');
    expect(rowSource).toContain('export function PriceCompareRow');
    expect(rowSource).toContain('isPriceChangeAlert');
    expect(statusSource).toContain('export function PriceCompareStatusChip');
  });

  test('helpers keep counts, CSV rows, and display formatting stable', () => {
    const rows = [
      { productCode: 'A', productName: '치즈', basePrice: 1000, latestPrice: 1200, changeAmount: 200, changeRate: 0.2, changeStatus: '인상' },
      { productCode: 'B', productName: '소스', basePrice: 1000, latestPrice: 900, changeAmount: -100, changeRate: -0.1, changeStatus: '인하' },
      { productCode: 'C', productName: '토핑', changeStatus: '신규' },
      { productCode: 'D', productName: '도우', changeStatus: '삭제' },
      { productCode: 'E', productName: '박스', changeStatus: '변동없음' },
    ];
    const lookup = new Map([['A', { productType: 'exclusive' }]]);

    expect(countPriceChangeStatuses(rows)).toEqual({
      all: 5,
      up: 1,
      down: 1,
      same: 1,
      new: 1,
      deleted: 1,
    });
    expect(buildPriceCompareCsvData(rows.slice(0, 1), lookup)).toEqual([
      ['제품코드', '제품명', '분류', '이전 단가', '현재 단가', '변동액', '변동률', '상태'],
      ['A', '치즈', 'exclusive', 1000, 1200, 200, '20.0', '인상'],
    ]);
    expect(getPriceCompareRowValues(rows[0])).toMatchObject({
      productCode: 'A',
      productName: '치즈',
      basePrice: 1000,
      latestPrice: 1200,
      changeAmount: 200,
      changeRate: 0.2,
      changeStatus: '인상',
    });
    expect(getPriceCompareRowValues(null)).toMatchObject({
      productCode: '-',
      productName: '-',
      basePrice: null,
      latestPrice: null,
    });
    expect(priceChangeColor('인상')).toBe('var(--negative)');
    expect(priceChangeColor('인하')).toBe('var(--positive)');
    expect(priceCompareAlertStyle('인상', true).background).toContain('var(--negative)');
    expect(priceCompareAlertStyle('인하', true).background).toContain('var(--positive)');
    expect(priceCompareAlertStyle('변동없음', false)).toBeUndefined();
    expect(formatPriceWon(1200)).toBe('1,200원');
    expect(formatPriceWon(null)).toBe('—');
    expect(formatChangeAmount(200)).toBe('+200원');
    expect(formatChangeAmount(-100)).toBe('-100원');
    expect(formatChangeRate(0.2)).toBe('▲ 20.0%');
    expect(formatChangeRate(-0.1)).toBe('▼ 10.0%');
  });
});
