import { describe, expect, test } from '@jest/globals';
import { comparePriceLists } from '../../lib/price/compare.js';

describe('price compare guards', () => {
  test('배열이 아닌 입력은 빈 비교 결과로 처리한다', () => {
    expect(comparePriceLists(null, null)).toEqual([]);
    expect(comparePriceLists({}, [])).toEqual([]);
    expect(comparePriceLists([], 'bad')).toEqual([]);
  });

  test('객체가 아닌 행은 무시하고 비교한다', () => {
    const result = comparePriceLists(
      ['bad', { productCode: 'A', productName: '치즈', price: 1000 }],
      [null, { productCode: 'A', productName: '치즈', price: 1200 }]
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productCode: 'A',
      productName: '치즈',
      changeStatus: '인상',
      changeAmount: 200,
      changeRate: 0.2,
    });
  });

  test('정상 비교 결과의 상태와 정렬은 유지한다', () => {
    const result = comparePriceLists(
      [
        { productCode: 'A', productName: '치즈', price: 1000 },
        { productCode: 'B', productName: '소스', price: 1000 },
      ],
      [
        { productCode: 'A', productName: '치즈', price: 900 },
        { productCode: 'C', productName: '토핑', price: 500 },
      ]
    );

    expect(result.map(row => row.changeStatus)).toEqual(['인하', '신규', '삭제']);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productCode: 'A', changeAmount: -100, changeRate: -0.1 }),
        expect.objectContaining({ productCode: 'B', changeStatus: '삭제' }),
        expect.objectContaining({ productCode: 'C', changeStatus: '신규' }),
      ])
    );
  });

  test('같은 productCode가 중복되면 마지막 행만 비교에 사용한다', () => {
    const result = comparePriceLists(
      [{ productCode: 'A', productName: '치즈', price: 1000 }],
      [
        { productCode: 'A', productName: '치즈 이전', price: 1100 },
        { productCode: 'A', productName: '치즈 최신', price: 1200 },
      ]
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productCode: 'A',
      productName: '치즈',
      latestPrice: 1200,
      changeStatus: '인상',
    });
  });
});
