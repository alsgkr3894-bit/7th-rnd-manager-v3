import { describe, expect, test } from '@jest/globals';
import {
  buildSalesReportFileName,
  buildSalesReportWorkbookSheets,
  formatSalesReportPeriodPart,
} from '@/lib/report/sales-export';

describe('sales report export helpers', () => {
  test('판매량 보고서 파일명은 월 표기를 다운로드용으로 정규화한다', () => {
    expect(formatSalesReportPeriodPart('2026년 5월')).toBe('2026년05월');
    expect(buildSalesReportFileName({ brandName: '브랜드A', periodLabel: '2026년 5월' })).toBe(
      '브랜드A_2026년05월 판매량 보고서.xlsx'
    );
  });

  test('옵션에 맞춰 순위 시트 컬럼과 카테고리 시트를 만든다', () => {
    const sheets = buildSalesReportWorkbookSheets({
      periodLabel: '2026년 5월',
      scope: '피자',
      kpi: { current: 30, previous: 20, deltaPct: 50 },
      catShares: [
        { name: '피자', value: 20 },
        { name: '사이드', value: 10 },
      ],
      groupRanking: [
        {
          rank: 1,
          name: '슈퍼콤비네이션',
          category: '피자',
          quantity: 12,
          prevQty: 10,
          delta: 2,
          deltaPct: 20,
          sizes: [
            { size: 'L', quantity: 7 },
            { size: 'R', quantity: 3 },
          ],
        },
      ],
      opts: { prevComp: true, variant: true },
    });

    expect(sheets.map(sheet => sheet.name)).toEqual([
      '요약',
      '카테고리별 비중',
      '전체 메뉴 순위',
      '피자',
    ]);
    expect(sheets[0].rows).toContainEqual(['대상', '피자']);
    expect(sheets[1].rows[1]).toEqual(['피자', 20, '66.7']);
    expect(sheets[2].rows[0]).toEqual([
      '순위',
      '메뉴명',
      '카테고리',
      '판매량',
      '전월',
      '증감',
      '증감(%)',
      'L판매',
      'R판매',
      '기타',
    ]);
    expect(sheets[2].rows[1]).toEqual([1, '슈퍼콤비네이션', '피자', 12, 10, 2, '+20.0%', 7, 3, 2]);
  });

  test('매출액 옵션이 켜지면 요약과 순위 시트에 금액 컬럼을 포함한다', () => {
    const sheets = buildSalesReportWorkbookSheets({
      periodLabel: '2026년 5월',
      scope: '전체',
      kpi: {
        current: 30,
        previous: 20,
        deltaPct: 50,
        revenue: 450000,
        previousRevenue: 300000,
        revenueDeltaPct: 50,
      },
      catShares: [{ name: '피자', value: 30, revenue: 450000 }],
      groupRanking: [
        {
          rank: 1,
          name: '슈퍼콤비네이션',
          category: '피자',
          quantity: 12,
          revenue: 240000,
          sizes: [
            { size: 'L', quantity: 7, revenue: 175000 },
            { size: 'R', quantity: 3, revenue: 60000 },
          ],
        },
      ],
      opts: { revenue: true, variant: true },
    });

    expect(sheets[0].rows).toContainEqual(['총 매출액', 450000]);
    expect(sheets[1].rows[0]).toEqual(['카테고리', '판매량', '매출액', '비중(%)']);
    expect(sheets[1].rows[1]).toEqual(['피자', 30, 450000, '100.0']);
    expect(sheets[2].rows[0]).toEqual([
      '순위',
      '메뉴명',
      '카테고리',
      '판매량',
      '매출액',
      'L판매',
      'L매출',
      'R판매',
      'R매출',
      '기타',
      '기타매출',
    ]);
    expect(sheets[2].rows[1]).toEqual([
      1,
      '슈퍼콤비네이션',
      '피자',
      12,
      240000,
      7,
      175000,
      3,
      60000,
      2,
      5000,
    ]);
  });

  test('잘못된 입력과 충돌하는 긴 카테고리명도 다운로드 가능한 시트로 정리한다', () => {
    const longA = '카테고리/충돌?이름*테스트[긴이름]A';
    const longB = '카테고리/충돌?이름*테스트[긴이름]B';
    const sheets = buildSalesReportWorkbookSheets({
      periodLabel: '2026년',
      scope: null,
      kpi: null,
      catShares: null,
      groupRanking: [
        null,
        { rank: 'bad', name: {}, category: longA, quantity: '5' },
        { rank: 2, name: '정상', category: longB, quantity: 3 },
      ],
      opts: { prevComp: true },
    });

    expect(sheets[0].rows).toContainEqual(['대상', '전체']);
    expect(sheets[2].rows[1]).toEqual([0, '—', longA, 5, 0, 0, '—']);
    const categorySheetNames = sheets.slice(3).map(sheet => sheet.name);
    expect(categorySheetNames).toHaveLength(2);
    expect(new Set(categorySheetNames).size).toBe(2);
    expect(categorySheetNames.every(name => name.length <= 31)).toBe(true);
    expect(categorySheetNames.every(name => !/[\\/?*[\]:]/.test(name))).toBe(true);
  });
});
