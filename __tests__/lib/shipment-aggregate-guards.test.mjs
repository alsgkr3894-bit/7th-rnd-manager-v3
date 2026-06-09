import { describe, expect, test } from '@jest/globals';
import { aggregateShipmentRows } from '../../lib/shipment/aggregate.js';

describe('shipment aggregate guards', () => {
  test('배열이 아닌 입력은 빈 집계 결과로 처리한다', () => {
    expect(aggregateShipmentRows(null)).toEqual([]);
    expect(aggregateShipmentRows({ productCode: 'A' })).toEqual([]);
  });

  test('객체가 아닌 행과 미매칭 행은 집계에서 제외한다', () => {
    const result = aggregateShipmentRows([
      null,
      'bad',
      { productCode: 'A', productName: '치즈', quantity: '2', amount: '3000' },
      { productCode: 'B', productName: '소스', quantity: 1, amount: 1000, matchStatus: 'unmatched' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productCode: 'A',
      productName: '치즈',
      totalQuantity: 2,
      totalAmount: 3000,
    });
  });

  test('관리품목 입력이 비배열이어도 정상 행 집계는 유지한다', () => {
    const result = aggregateShipmentRows(
      [{ productCode: 'A', productName: '치즈', quantity: 3, amount: 5000 }],
      null
    );

    expect(result[0]).toMatchObject({
      productType: 'generic',
      isManaged: false,
    });
  });

  test('관리품목 매칭과 가격 lookup을 유지한다', () => {
    const result = aggregateShipmentRows(
      [{ productCode: 'A', productName: '치즈', quantity: 3, amount: 5000 }],
      [{ productCode: 'A', productName: '치즈', productType: 'exclusive', isManaged: true }],
      new Map([['A', '1200']])
    );

    expect(result[0]).toMatchObject({
      productCode: 'A',
      productType: 'exclusive',
      isManaged: true,
      priceWithTax: 1200,
      totalQuantity: 3,
      totalAmount: 5000,
    });
  });
});
