import { describe, expect, test } from '@jest/globals';
import {
  buildShipmentMonthMap,
  buildShipmentTrendSeries,
} from '../../lib/report/build-shipment-report.js';

const mkFile = (year, month, extra = {}) => ({ year, month, ...extra });

describe('buildShipmentMonthMap', () => {
  test('null 또는 빈 배열이면 빈 배열을 반환한다', () => {
    expect(buildShipmentMonthMap(null)).toEqual([]);
    expect(buildShipmentMonthMap([])).toEqual([]);
    expect(buildShipmentMonthMap('bad')).toEqual([]);
  });

  test('비객체 배열 요소는 무시된다', () => {
    const result = buildShipmentMonthMap([null, 'bad', 42, mkFile(2026, 6)]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ year: 2026, month: 6 });
  });

  test('year 또는 month가 0/falsy인 파일은 제외된다', () => {
    const files = [mkFile(2026, 5), mkFile(0, 5), mkFile(2026, 0), { name: 'no-date' }];
    const result = buildShipmentMonthMap(files);
    expect(result).toHaveLength(1);
    expect(result[0].files).toHaveLength(1);
  });

  test('같은 연월의 파일은 하나의 그룹으로 묶인다', () => {
    const files = [
      mkFile(2026, 5, { name: 'a' }),
      mkFile(2026, 5, { name: 'b' }),
      mkFile(2026, 4, { name: 'c' }),
    ];
    const result = buildShipmentMonthMap(files);
    expect(result).toHaveLength(2);
    const may = result.find(r => r.month === 5);
    const apr = result.find(r => r.month === 4);
    expect(may?.files).toHaveLength(2);
    expect(apr?.files).toHaveLength(1);
  });

  test('각 그룹 객체는 year, month, files 필드를 갖는다', () => {
    const result = buildShipmentMonthMap([mkFile(2025, 12)]);
    expect(result[0]).toMatchObject({ year: 2025, month: 12, files: expect.any(Array) });
  });
});

describe('buildShipmentTrendSeries', () => {
  test('빈 monthlyRows면 빈 시리즈를 반환한다', () => {
    expect(buildShipmentTrendSeries([], [])).toEqual({ exclusiveData: [], genericData: [] });
  });

  test('월 수만큼 데이터 포인트를 생성한다', () => {
    const result = buildShipmentTrendSeries([[], [], []], []);
    expect(result.exclusiveData).toHaveLength(3);
    expect(result.genericData).toHaveLength(3);
    result.exclusiveData.forEach(v => expect(v).toBe(0));
    result.genericData.forEach(v => expect(v).toBe(0));
  });

  test('전용품목(exclusive)과 일반품목(generic) 수량을 분리해 집계한다', () => {
    const managedProducts = [{ productCode: 'EX-001', productType: 'exclusive' }];
    const rows = [
      { productCode: 'EX-001', productName: '전용품목', quantity: 10, amount: 10000 },
      { productCode: 'GEN-001', productName: '일반품목', quantity: 5, amount: 5000 },
    ];
    const result = buildShipmentTrendSeries([rows], managedProducts);
    expect(result.exclusiveData).toEqual([10]);
    expect(result.genericData).toEqual([5]);
  });

  test('비정상 수량(Infinity, 문자열)은 0으로 처리한다', () => {
    const rows = [
      { productCode: 'X', productName: '품목', quantity: 'bad', amount: 0 },
      { productCode: 'Y', productName: '품목2', quantity: Infinity, amount: 0 },
    ];
    const result = buildShipmentTrendSeries([rows], []);
    expect(result.genericData[0]).toBe(0);
  });
});
