import { describe, expect, test } from '@jest/globals';
import { buildCompareSeries } from '../../lib/report/build-compare-report.js';

const mkRow = (year, month, category, quantity, status = 'classified') => ({
  year,
  month,
  category,
  quantity,
  status,
});

const periodA = { year: 2026, month: 5 };
const periodB = { year: 2026, month: 4 };

describe('buildCompareSeries', () => {
  test('null/빈 입력은 빈 배열을 반환한다', () => {
    expect(buildCompareSeries(null, periodA, periodB, 'all', 5)).toEqual([]);
    expect(buildCompareSeries([], periodA, periodB, 'all', 5)).toEqual([]);
    expect(buildCompareSeries('bad', periodA, periodB, 'all', 5)).toEqual([]);
  });

  test('classified 아닌 행은 무시된다', () => {
    const rows = [mkRow(2026, 5, 'pizza', 10, 'unclassified')];
    expect(buildCompareSeries(rows, periodA, periodB, 'all', 5)).toEqual([]);
  });

  test('기본 케이스: A·B 기간 카테고리별 수량 시리즈를 반환한다', () => {
    const rows = [
      mkRow(2026, 5, 'pizza', 10),
      mkRow(2026, 4, 'pizza', 7),
      mkRow(2026, 5, 'side', 3),
    ];
    const result = buildCompareSeries(rows, periodA, periodB, 'all', 5);

    expect(result).toHaveLength(2);
    expect(result[0].name).toContain('5월');
    expect(result[1].name).toContain('4월');

    const catIndex = result[0].data.length;
    expect(catIndex).toBe(2);

    const pizzaIdx = result[0].data.indexOf(10);
    expect(pizzaIdx).toBeGreaterThanOrEqual(0);
    expect(result[1].data[pizzaIdx]).toBe(7);
  });

  test('scope 필터가 특정 카테고리만 포함시킨다', () => {
    const rows = [mkRow(2026, 5, 'pizza', 10), mkRow(2026, 5, 'side', 20)];
    const result = buildCompareSeries(rows, periodA, periodB, 'pizza', 5);
    expect(result[0].data).toHaveLength(1);
    expect(result[0].data[0]).toBe(10);
  });

  test('scope: all이면 모든 카테고리를 포함한다', () => {
    const rows = [
      mkRow(2026, 5, 'pizza', 5),
      mkRow(2026, 5, 'side', 3),
      mkRow(2026, 5, 'drink', 2),
    ];
    const result = buildCompareSeries(rows, periodA, periodB, 'all', 5);
    expect(result[0].data).toHaveLength(3);
  });

  test('비정상 수량(문자열, Infinity)은 0으로 정규화된다', () => {
    const rows = [
      { year: 2026, month: 5, category: 'pizza', quantity: 'bad', status: 'classified' },
      { year: 2026, month: 5, category: 'side', quantity: Infinity, status: 'classified' },
    ];
    const result = buildCompareSeries(rows, periodA, periodB, 'all', 5);
    expect(result).toHaveLength(0);
  });

  test('비객체 배열 요소는 무시된다', () => {
    const rows = [null, 'bad', mkRow(2026, 5, 'pizza', 10), null];
    const result = buildCompareSeries(rows, periodA, periodB, 'all', 5);
    expect(result).toHaveLength(2);
    expect(result[0].data[0]).toBe(10);
  });
});
