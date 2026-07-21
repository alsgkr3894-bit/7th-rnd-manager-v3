import { describe, expect, test } from '@jest/globals';
import {
  buildMarginExcelRows,
  buildMarginExcelRowsAllPlatforms,
} from '../../lib/cost/margin/export.js';

const ROWS = [
  {
    menuCategory: '피자',
    menuName: '테스트 피자',
    costMap: { L: 3000, R: 2800 },
    sizes: [
      { label: 'L', sellingPrice: 10000 },
      { label: 'R', sellingPrice: 9000 },
    ],
  },
];

const DEFAULT_PLAT = { id: 'default', name: '기본', fees: [] };
const BAEMIN_PLAT = {
  id: 'baemin',
  name: '배달의민족',
  fees: [
    { id: 'f1', label: '플랫폼수수료', type: 'pct', value: 7.5 },
    { id: 'f2', label: '배달비', type: 'fixed', value: 3000 },
  ],
};

describe('buildMarginExcelRows', () => {
  test('플랫폼 수수료가 있으면 없을 때보다 원가율이 높게 계산된다', () => {
    const withDefault = buildMarginExcelRows(ROWS, ['L', 'R'], 'cost', DEFAULT_PLAT, null);
    const withBaemin = buildMarginExcelRows(ROWS, ['L', 'R'], 'cost', BAEMIN_PLAT, null);

    const defaultRate = parseFloat(withDefault[1][4]);
    const baeminRate = parseFloat(withBaemin[1][4]);
    expect(baeminRate).toBeGreaterThan(defaultRate);
  });
});

describe('buildMarginExcelRowsAllPlatforms', () => {
  const platforms = [DEFAULT_PLAT, BAEMIN_PLAT];

  test('플랫폼 수만큼 사이즈별 원가율 컬럼이 나란히 생성된다', () => {
    const sheet = buildMarginExcelRowsAllPlatforms(ROWS, ['L', 'R'], 'cost', platforms, null);
    const headers = sheet[0];

    expect(headers).toEqual([
      '카테고리',
      '메뉴명',
      'L 판매가',
      'L 원가',
      'L 기본 원가율',
      'L 배달의민족 원가율',
      'R 판매가',
      'R 원가',
      'R 기본 원가율',
      'R 배달의민족 원가율',
    ]);
  });

  test('각 플랫폼 컬럼 값이 해당 플랫폼의 실제 수수료를 반영한다', () => {
    const sheet = buildMarginExcelRowsAllPlatforms(ROWS, ['L', 'R'], 'cost', platforms, null);
    const row = sheet[1];

    // L: 판매가 10000, 원가 3000
    expect(row[0]).toBe('피자');
    expect(row[1]).toBe('테스트 피자');
    expect(row[2]).toBe(10000);
    expect(row[3]).toBe(3000);
    const lDefaultRate = parseFloat(row[4]);
    const lBaeminRate = parseFloat(row[5]);
    expect(lDefaultRate).toBeCloseTo(30, 1);
    expect(lBaeminRate).toBeGreaterThan(lDefaultRate);
  });

  test('원가/판매가가 없는 행은 플랫폼별 컬럼을 빈 값으로 채운다', () => {
    const rows = [{ menuCategory: '피자', menuName: '데이터 없음', costMap: {}, sizes: [] }];
    const sheet = buildMarginExcelRowsAllPlatforms(rows, ['L'], 'cost', platforms, null);

    expect(sheet[1]).toEqual(['피자', '데이터 없음', '', '', '', '']);
  });

  test('플랫폼 목록이 비어있어도 판매가·원가 컬럼은 유지된다', () => {
    const sheet = buildMarginExcelRowsAllPlatforms(ROWS, ['L'], 'cost', [], null);
    expect(sheet[0]).toEqual(['카테고리', '메뉴명', 'L 판매가', 'L 원가']);
  });
});
