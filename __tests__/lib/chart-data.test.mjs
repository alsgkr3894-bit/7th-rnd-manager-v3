import { describe, expect, test } from '@jest/globals';
import {
  normalizeAreaSeries,
  normalizeChartColor,
  normalizeChartColors,
  normalizeChartDimension,
  normalizeChartFormatter,
  normalizeChartLabels,
  normalizeDonutItems,
  normalizeNumberSeries,
} from '../../lib/ui/chart-data.js';

describe('normalizeNumberSeries', () => {
  test('배열이 아니면 빈 배열로 처리한다', () => {
    expect(normalizeNumberSeries(null)).toEqual([]);
  });

  test('숫자가 아닌 값은 0으로 보정한다', () => {
    expect(normalizeNumberSeries([1, '2', 'bad', Infinity, null])).toEqual([1, 2, 0, 0, 0]);
  });
});

describe('normalizeDonutItems', () => {
  test('배열이 아니면 빈 배열로 처리한다', () => {
    expect(normalizeDonutItems(undefined)).toEqual([]);
  });

  test('양수가 아닌 value는 0으로 보정하고 나머지 필드는 보존한다', () => {
    expect(normalizeDonutItems([
      { label: 'A', value: 10, color: '#111' },
      { label: 'B', value: -5, color: '#222' },
      { label: 'C', value: 'bad', color: '#333' },
    ])).toEqual([
      { label: 'A', value: 10, color: '#111' },
      { label: 'B', value: 0, color: '#222' },
      { label: 'C', value: 0, color: '#333' },
    ]);
  });
});

describe('normalizeAreaSeries', () => {
  test('배열이 아니면 빈 시리즈로 처리한다', () => {
    expect(normalizeAreaSeries(null)).toEqual([]);
  });

  test('시리즈 데이터와 이름을 안전한 형태로 정규화한다', () => {
    expect(normalizeAreaSeries([
      { name: '판매량', data: [1, '2', 'bad'] },
      { name: 10, data: null },
      null,
    ])).toEqual([
      { name: '판매량', data: [1, 2, 0] },
      { name: '', data: [] },
      { name: '', data: [] },
    ]);
  });
});

describe('normalizeChartLabels', () => {
  test('배열이 아니면 빈 라벨로 처리한다', () => {
    expect(normalizeChartLabels(undefined)).toEqual([]);
  });

  test('라벨을 문자열로 정규화한다', () => {
    expect(normalizeChartLabels(['1월', 2, null])).toEqual(['1월', '2', '']);
  });

  test('객체 라벨은 화면에 [object Object]로 표시하지 않는다', () => {
    expect(normalizeChartLabels([{ label: 'bad' }, '2월'])).toEqual(['', '2월']);
  });
});

describe('normalizeChartDimension', () => {
  test('숫자형 차트 크기를 지정 범위 안으로 제한한다', () => {
    expect(normalizeChartDimension('120', 56, { min: 10, max: 200 })).toBe(120);
    expect(normalizeChartDimension(0, 56, { min: 10, max: 200 })).toBe(10);
    expect(normalizeChartDimension(300, 56, { min: 10, max: 200 })).toBe(200);
  });

  test('비정상 크기는 fallback으로 복구한다', () => {
    expect(normalizeChartDimension('bad', 56)).toBe(56);
    expect(normalizeChartDimension(Infinity, 56)).toBe(56);
  });
});

describe('normalizeChartColor', () => {
  test('비어 있지 않은 문자열 색상만 보존한다', () => {
    expect(normalizeChartColor('#111')).toBe('#111');
    expect(normalizeChartColor('', '#888')).toBe('#888');
    expect(normalizeChartColor({ color: '#111' }, '#888')).toBe('#888');
  });
});

describe('normalizeChartColors', () => {
  test('색상 배열의 비정상 항목을 fallback으로 보정한다', () => {
    expect(normalizeChartColors(['#111', null, ''], '#888')).toEqual(['#111', '#888', '#888']);
    expect(normalizeChartColors(null)).toEqual([]);
  });
});

describe('normalizeChartFormatter', () => {
  test('함수 formatter만 보존한다', () => {
    const fallback = value => String(value);
    const custom = value => `${value}개`;
    expect(normalizeChartFormatter(custom, fallback)).toBe(custom);
    expect(normalizeChartFormatter('bad', fallback)).toBe(fallback);
  });
});
