import { describe, expect, test } from '@jest/globals';
import { makeReportPrintTitle } from '../../lib/report/print.js';

describe('makeReportPrintTitle', () => {
  test('브랜드, 기간, 보고서명, 생성일을 파일명 친화적인 제목으로 만든다', () => {
    expect(makeReportPrintTitle(
      { period: '2026년 6월', name: '2026년 6월 판매량 보고서' },
      { brandName: '테스트 브랜드', now: new Date('2026-06-08T00:00:00.000Z') },
    )).toBe('테스트브랜드_2026년06월 판매량보고서_20260608');
  });

  test('기간이 없는 보고서도 안정적인 제목을 만든다', () => {
    expect(makeReportPrintTitle(
      { name: '원가/마진: 위험 메뉴 <요약>' },
      { brandName: '7번가피자', now: new Date('2026-01-02T00:00:00.000Z') },
    )).toBe('7번가피자_원가마진위험메뉴요약_20260102');
  });
});
