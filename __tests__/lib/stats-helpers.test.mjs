import { describe, expect, test } from '@jest/globals';
import { asObjectRows, pickLatestYearMonth, pickMenuName } from '../../lib/stats/_helpers.js';

describe('stats helpers', () => {
  test('asObjectRows는 일반 객체 행만 보존한다', () => {
    expect(asObjectRows([{ id: 1 }, null, ['bad'], 'bad', { id: 2 }])).toEqual([
      { id: 1 },
      { id: 2 },
    ]);
  });

  test('pickMenuName은 손상 행에서도 기본 이름으로 복구한다', () => {
    expect(pickMenuName(null)).toBe('(미상)');
    expect(pickMenuName({ mappedMenuName: '매핑명' })).toBe('매핑명');
    expect(pickMenuName({ normalizedMenuName: '정규명' })).toBe('정규명');
    expect(pickMenuName({ mappedMenuName: {}, normalizedMenuName: '정상후보' })).toBe('정상후보');
    expect(pickMenuName({ mappedMenuName: {}, normalizedMenuName: null, rawMenuName: 123 })).toBe(
      '123'
    );
  });

  test('pickLatestYearMonth는 손상 행과 잘못된 월을 무시한다', () => {
    expect(
      pickLatestYearMonth([
        null,
        'bad',
        { year: 2026, month: 13 },
        { year: '2026', month: '5' },
        { year: 2025, month: 12 },
        { year: 2026, month: 4 },
      ])
    ).toEqual({ year: 2026, month: 5 });
  });
});
