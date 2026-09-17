import { describe, expect, test } from '@jest/globals';
import {
  competitorOptionsOf,
  findRowById,
  photosOf,
  previewTextOf,
} from '@/app/note/market/marketPageUtils';

describe('market page utils', () => {
  test('competitorOptionsOf — 공백 정리·중복 제거 후 한국어 정렬한 datalist 후보', () => {
    const rows = [
      { competitor: ' 피자헛 ' },
      { competitor: '도미노' },
      { competitor: '피자헛' },
      { competitor: '' },
      { competitor: '   ' },
      {},
    ];
    expect(competitorOptionsOf(rows)).toEqual(['도미노', '피자헛']);
    expect(competitorOptionsOf([])).toEqual([]);
    expect(competitorOptionsOf(null)).toEqual([]);
  });

  test('photosOf — data 있는 사진만 남기고 photos가 배열이 아니면 빈 배열', () => {
    const ok = { data: 'data:image/png;base64,x', caption: 'a' };
    expect(photosOf({ photos: [ok, { caption: 'no-data' }, null] })).toEqual([ok]);
    expect(photosOf({ photos: 'oops' })).toEqual([]);
    expect(photosOf({})).toEqual([]);
    expect(photosOf(null)).toEqual([]);
  });

  test('previewTextOf — 시장 흐름 → 참고 포인트 → 개발 방향 순, 없으면 "내용 없음"', () => {
    expect(previewTextOf({ marketTrend: 'T', referencePoint: 'R' })).toBe('T');
    expect(previewTextOf({ marketTrend: '', referencePoint: 'R' })).toBe('R');
    expect(previewTextOf({ developmentDirection: 'D' })).toBe('D');
    expect(previewTextOf({})).toBe('내용 없음');
    expect(previewTextOf(null)).toBe('내용 없음');
  });

  test('findRowById — id 타입이 달라도 문자열 비교, 없으면 null', () => {
    const rows = [{ id: 1 }, { id: 'abc' }];
    expect(findRowById(rows, '1')).toBe(rows[0]);
    expect(findRowById(rows, 1)).toBe(rows[0]);
    expect(findRowById(rows, 'abc')).toBe(rows[1]);
    expect(findRowById(rows, 'zzz')).toBeNull();
    expect(findRowById(rows, null)).toBeNull();
    expect(findRowById(rows, '')).toBeNull();
    expect(findRowById(undefined, '1')).toBeNull();
  });
});
