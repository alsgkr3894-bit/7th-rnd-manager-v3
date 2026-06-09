import { describe, expect, test } from '@jest/globals';
import { getProductTypeCounts, sortByKey } from '../../lib/jette/utils.js';

describe('jette utils guards', () => {
  test('sortByKey는 비배열 입력과 깨진 행을 안전하게 처리한다', () => {
    expect(sortByKey(null, 'name', 'asc')).toEqual([]);

    const rows = [
      null,
      { name: '나', amount: 2 },
      { name: '가', amount: 3 },
      { name: null, amount: 1 },
    ];

    expect(sortByKey(rows, 'name', 'asc').map(row => row.name)).toEqual(['가', '나', null]);
    expect(sortByKey(rows, 'amount', 'desc').map(row => row.amount)).toEqual([3, 2, 1]);
  });

  test('sortByKey는 유효한 transform만 적용한다', () => {
    const rows = [{ price: '10' }, { price: '2' }, { price: null }];

    expect(
      sortByKey(rows, 'price', 'asc', value => Number(value) || null).map(row => row.price)
    ).toEqual(['2', '10', null]);
    expect(sortByKey(rows, 'price', 'asc', 'bad').map(row => row.price)).toEqual(['10', '2', null]);
  });

  test('getProductTypeCounts는 lookup이 없거나 깨진 행이 있어도 기본 카운트를 반환한다', () => {
    expect(getProductTypeCounts(null, null)).toEqual({
      exclusive: 0,
      generic: 0,
      'generic-managed': 0,
    });

    const lookup = new Map([
      ['A', { productType: 'exclusive' }],
      ['B', { productType: 'generic' }],
      ['C', { productType: 'generic-managed' }],
    ]);

    expect(
      getProductTypeCounts(
        [
          null,
          { productCode: 'A' },
          { productCode: 'B' },
          { productCode: 'C' },
          { productCode: 123 },
        ],
        lookup
      )
    ).toEqual({
      exclusive: 1,
      generic: 1,
      'generic-managed': 1,
    });
  });
});
