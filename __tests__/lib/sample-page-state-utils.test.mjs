import { describe, expect, test } from '@jest/globals';
import {
  SAMPLE_RATING_KEYS,
  SAMPLE_SORT_KEYS,
  SAMPLE_VIEW_KEYS,
  buildSampleCalendarDays,
  buildSampleCategoryCounts,
  buildSampleRatingDist,
  buildSamplesByDate,
  filterSortSamples,
  pickAllowed,
} from '@/app/note/sample/samplePageStateUtils';

describe('sample page state utils', () => {
  const samples = [
    {
      id: 'a',
      title: '첫 샘플',
      sampleNames: ['페퍼로니'],
      category: '토핑식자재',
      company: 'A사',
      description: '매운맛',
      tags: '스파이시',
      rating: 4,
      testDate: '2026-06-10',
      createdAt: '2026-06-10T09:00:00.000Z',
    },
    {
      id: 'b',
      title: '둘째 샘플',
      sampleNames: ['치즈'],
      category: '소스',
      company: 'B사',
      description: '고소함',
      tags: '치즈',
      rating: 0,
      testDate: '2026-06-12',
      createdAt: '2026-06-12T09:00:00.000Z',
    },
    {
      id: 'c',
      title: '셋째 샘플',
      sampleNames: ['마늘'],
      category: '토핑식자재',
      company: 'C사',
      description: '담백함',
      tags: '',
      rating: 5,
      testDate: '',
      createdAt: '2026-06-11T09:00:00.000Z',
    },
  ];

  test('pickAllowed protects persisted filter keys', () => {
    expect(pickAllowed('rating', SAMPLE_SORT_KEYS, 'createdAt')).toBe('rating');
    expect(pickAllowed('bad', SAMPLE_SORT_KEYS, 'createdAt')).toBe('createdAt');
    expect(pickAllowed('calendar', SAMPLE_VIEW_KEYS, 'grid')).toBe('calendar');
    expect(pickAllowed(7, SAMPLE_RATING_KEYS, 0)).toBe(0);
  });

  test('filterSortSamples filters by category, rating, search, and sort option', () => {
    expect(
      filterSortSamples(samples, {
        catFilter: '토핑식자재',
        ratingMin: 0,
        search: '',
        sortBy: 'createdAt',
      }).map(sample => sample.id)
    ).toEqual(['c', 'a']);
    expect(
      filterSortSamples(samples, {
        catFilter: 'all',
        ratingMin: -1,
        search: '',
        sortBy: 'createdAt',
      }).map(sample => sample.id)
    ).toEqual(['b']);
    expect(
      filterSortSamples(samples, {
        catFilter: 'all',
        ratingMin: 3,
        search: '',
        sortBy: 'rating',
      }).map(sample => sample.id)
    ).toEqual(['c', 'a']);
    expect(
      filterSortSamples(samples, {
        catFilter: 'all',
        ratingMin: 0,
        search: '치즈',
        sortBy: 'testDate',
      }).map(sample => sample.id)
    ).toEqual(['b']);
  });

  test('summary helpers build category counts, rating distribution, dates, and calendar cells', () => {
    expect(buildSampleCategoryCounts(samples)).toEqual({ all: 3, 토핑식자재: 2, 소스: 1 });
    expect(buildSampleRatingDist(samples)).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, none: 1 });
    expect(Object.keys(buildSamplesByDate(samples))).toEqual(['2026-06-10', '2026-06-12']);
    expect(buildSampleCalendarDays(new Date(2026, 5, 1))).toHaveLength(42);
  });

  test('helpers tolerate non-array input', () => {
    expect(
      filterSortSamples(null, { catFilter: 'all', ratingMin: 0, search: '', sortBy: 'createdAt' })
    ).toEqual([]);
    expect(buildSampleCategoryCounts(null)).toEqual({ all: 0 });
    expect(buildSampleRatingDist(null).none).toBe(0);
    expect(buildSamplesByDate(null)).toEqual({});
  });

  // R4-M4 회귀: createdAt 누락 시 new Date()-new Date()=NaN으로 정렬이 깨지지 않아야 한다
  test('createdAt 정렬은 누락 값이 있어도 안정적으로 동작한다', () => {
    const withMissing = [
      { id: 'x', createdAt: '2026-06-12T00:00:00.000Z' },
      { id: 'y' }, // createdAt 없음
      { id: 'z', createdAt: '2026-06-15T00:00:00.000Z' },
    ];
    const sorted = filterSortSamples(withMissing, {
      catFilter: 'all',
      ratingMin: 0,
      search: '',
      sortBy: 'createdAt',
    });
    // 최신순: z(15) → x(12) → y(없음) 순으로 결정적 정렬
    expect(sorted.map(s => s.id)).toEqual(['z', 'x', 'y']);
  });
});
