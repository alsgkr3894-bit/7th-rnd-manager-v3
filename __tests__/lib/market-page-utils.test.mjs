import { describe, expect, test } from '@jest/globals';
import {
  allBrandsExpanded,
  competitorOptionsOf,
  brandOptionsOf,
  findRowById,
  photosOf,
  previewTextOf,
  toggleExpandedBrand,
} from '@/app/note/market/marketPageUtils';
import { groupByCompetitor, withToday } from '@/app/note/market/marketUtils';

describe('market page utils', () => {
  test('브랜드별 접기와 모두 펼치기는 현재 그룹만 기준으로 판단한다', () => {
    const groups = [{ label: '도미노' }, { label: '피자헛' }];
    const first = toggleExpandedBrand(new Set(), '도미노');
    expect([...first]).toEqual(['도미노']);
    expect(allBrandsExpanded(groups, first)).toBe(false);
    const both = toggleExpandedBrand(first, '피자헛');
    expect(allBrandsExpanded(groups, both)).toBe(true);
    expect([...toggleExpandedBrand(both, '도미노')]).toEqual(['피자헛']);
    expect(allBrandsExpanded([], both)).toBe(false);
  });

  test('기존 브랜드와 경쟁사 값은 편집 시 한 칸에 모으고 브랜드별로 묶는다', () => {
    const legacy = { id: 1, brand: '도미노', competitor: '피자헛', date: '2026-10-21' };
    expect(withToday(legacy)).toMatchObject({
      brand: '도미노 · 피자헛',
      competitor: '',
      releaseDate: '',
    });
    expect(groupByCompetitor([legacy])[0].label).toBe('피자헛');
    expect(withToday().type).toBe('시장조사');
    expect(withToday({ type: '올해트렌드' }).type).toBe('올해트렌드');
  });

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
    expect(brandOptionsOf([{ brand: '도미노' }, { brand: 'BBQ', competitor: '치킨' }])).toEqual([
      '도미노',
      'BBQ · 치킨',
    ]);
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
