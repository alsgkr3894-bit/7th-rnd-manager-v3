import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { makeReportPrintTitle } from '../../lib/report/print.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('makeReportPrintTitle', () => {
  test('브랜드, 기간, 보고서명, 생성일을 파일명 친화적인 제목으로 만든다', () => {
    expect(
      makeReportPrintTitle(
        { period: '2026년 6월', name: '2026년 6월 판매량 보고서' },
        { brandName: '테스트 브랜드', now: new Date('2026-06-08T00:00:00.000Z') }
      )
    ).toBe('테스트 브랜드_2026년06월 판매량 보고서_20260608');
  });

  test('기간이 없는 보고서도 안정적인 제목을 만든다', () => {
    expect(
      makeReportPrintTitle(
        { name: '원가/마진: 위험 메뉴 <요약>' },
        { brandName: '7번가피자', now: new Date('2026-01-02T00:00:00.000Z') }
      )
    ).toBe('7번가피자_원가마진 위험 메뉴 요약_20260102');
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
    ).toBe(`테스트_판매량 보고서_${expectedDate}`);
  });
});

// 회귀: 판매량 보고서 "단종"/"비정규메뉴" 배지는 다크모드 테마 CSS 변수
// (var(--text-3) 등)로 색을 쓴다. 인쇄/PDF 저장 시 배경을 흰색으로 강제하는
// 프린터·PDF 드라이버가 있어, 다크모드용 밝은 회색·주황 글자가 흰 배경 위에서
// 거의 안 보이던 문제가 있었다 — 인쇄 중에는 테마와 무관한 고정 고대비 색으로
// 덮어써야 한다. 또한 클릭해도 의미 없는 액션 버튼(전체 해제·개별 마크)은
// 인쇄물에서 숨겨야 한다.
describe('판매량 보고서 인쇄 — 단종/비정규메뉴 배지 가독성', () => {
  const printSrc = src('lib/report/print.js');
  const discontinuedBadgeSrc = src('components/sales/DiscontinuedBadge.jsx');
  const irregularBadgeSrc = src('components/sales/IrregularMenuBadge.jsx');
  const rankRowsSrc = src('components/report/sales/SalesRankTableRows.jsx');
  const bulkFixSrc = src('components/report/sales/SalesDiscontinuedBulkFix.jsx');

  test('배지 컴포넌트가 인쇄 CSS에서 타겟팅할 클래스명을 갖는다', () => {
    expect(discontinuedBadgeSrc).toContain('discontinued-badge');
    expect(irregularBadgeSrc).toContain('irregular-menu-badge');
  });

  test('인쇄 스타일이 두 배지 모두 고정 고대비 색으로 덮어쓰고, 해제 버튼은 숨긴다', () => {
    expect(printSrc).toContain('.discontinued-badge');
    expect(printSrc).toContain('.irregular-menu-badge');
    expect(printSrc).toContain('.discontinued-badge button');
    expect(printSrc).toContain('.irregular-menu-badge button');
    expect(printSrc).toContain('display: none !important');
  });

  test('클릭 전용 액션(단종 마크 버튼·전체 해제 바)은 no-print로 인쇄에서 빠진다', () => {
    expect(rankRowsSrc).toContain('mark-irregular-btn no-print');
    expect(bulkFixSrc).toContain('card no-print');
  });
});
