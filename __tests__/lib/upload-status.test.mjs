import { previousMonthOf, isUploadPeriodStale } from '../../lib/stats/upload-status.js';

describe('upload-status 신선도 기준', () => {
  test('previousMonthOf는 1월에서 전년도 12월로 넘어간다', () => {
    expect(previousMonthOf(new Date('2026-01-15T00:00:00.000Z'))).toEqual({
      year: 2025,
      month: 12,
    });
  });

  test('previousMonthOf는 현재월의 직전 월을 기준으로 삼는다', () => {
    expect(previousMonthOf(new Date('2026-06-08T00:00:00.000Z'))).toEqual({
      year: 2026,
      month: 5,
    });
  });

  test('isUploadPeriodStale는 기준월보다 오래된 업로드만 stale로 판단한다', () => {
    const target = { year: 2026, month: 5 };

    expect(isUploadPeriodStale(2026, 4, target)).toBe(true);
    expect(isUploadPeriodStale(2026, 5, target)).toBe(false);
    expect(isUploadPeriodStale(2026, 6, target)).toBe(false);
    expect(isUploadPeriodStale(2025, 12, target)).toBe(true);
  });

  test('isUploadPeriodStale는 깨진 연월을 stale로 처리한다', () => {
    const target = { year: 2026, month: 5 };

    expect(isUploadPeriodStale(null, 5, target)).toBe(true);
    expect(isUploadPeriodStale(2026, 'bad', target)).toBe(true);
    expect(isUploadPeriodStale(2026, 13, target)).toBe(true);
  });
});
