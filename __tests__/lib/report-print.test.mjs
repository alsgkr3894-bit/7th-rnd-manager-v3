import { describe, expect, test } from '@jest/globals';
import { makeReportPrintTitle } from '../../lib/report/print.js';

describe('makeReportPrintTitle', () => {
  test('브랜드, 기간, 보고서명, 생성일을 파일명 친화적인 제목으로 만든다', () => {
    expect(
      makeReportPrintTitle(
        { period: '2026년 6월', name: '2026년 6월 판매량 보고서' },
        { brandName: '테스트 브랜드', now: new Date('2026-06-08T00:00:00.000Z') }
      )
    ).toBe('테스트브랜드_2026년06월 판매량보고서_20260608');
  });

  test('기간이 없는 보고서도 안정적인 제목을 만든다', () => {
    expect(
      makeReportPrintTitle(
        { name: '원가/마진: 위험 메뉴 <요약>' },
        { brandName: '7번가피자', now: new Date('2026-01-02T00:00:00.000Z') }
      )
    ).toBe('7번가피자_원가마진위험메뉴요약_20260102');
  });

  test('null 보고서 메타와 잘못된 옵션도 기본 보고서 제목으로 처리한다', () => {
    expect(
      makeReportPrintTitle(null, {
        brandName: '테스트/브랜드',
        now: new Date('2026-06-08T00:00:00.000Z'),
      })
    ).toBe('테스트브랜드_보고서_20260608');
  });

  test('유효하지 않은 생성일은 오늘 날짜로 폴백한다', () => {
    const today = new Date();
    const expectedDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');

    expect(
      makeReportPrintTitle(
        { name: '판매량 보고서' },
        { brandName: '테스트', now: new Date('invalid') }
      )
    ).toBe(`테스트_판매량보고서_${expectedDate}`);
  });
});
