import {
  buildSampleFilterPath,
  buildSampleFilterQuery,
  readSampleCatFilter,
  readSampleRatingMin,
} from '@/app/note/sample/samplePageFilterStateUtils';

describe('sample page filter state utils', () => {
  test('카테고리와 별점 필터를 샘플 URL query로 변환한다', () => {
    expect(buildSampleFilterQuery({ catFilter: 'pizza', ratingMin: 4 })).toBe('cat=pizza&r=4');
    expect(
      buildSampleFilterPath({
        pathname: '/note/sample',
        catFilter: 'pizza',
        ratingMin: 4,
      })
    ).toBe('/note/sample?cat=pizza&r=4');
  });

  test('기본 필터는 query 없이 pathname만 유지한다', () => {
    expect(
      buildSampleFilterPath({
        pathname: '/note/sample',
        catFilter: 'all',
        ratingMin: 0,
      })
    ).toBe('/note/sample');
  });

  test('검색 파라미터 초기값은 허용된 별점만 사용한다', () => {
    const validParams = new URLSearchParams('cat=side&r=5');
    const invalidParams = new URLSearchParams('cat=drink&r=2');

    expect(readSampleCatFilter(validParams)).toBe('side');
    expect(readSampleRatingMin(validParams)).toBe(5);
    expect(readSampleCatFilter(new URLSearchParams())).toBe('all');
    expect(readSampleRatingMin(invalidParams)).toBe(0);
  });
});
