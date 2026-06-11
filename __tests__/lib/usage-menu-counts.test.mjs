import { describe, expect, test } from '@jest/globals';
import { downloadDateStamp } from '../../lib/download.js';
import { printUsageReport } from '../../lib/cost/usage-print.js';
import { getUsageMenuCounts, getUsageRowsMenuCounts } from '../../lib/cost/usage-counts.js';

describe('제품별 사용현황 메뉴수 집계', () => {
  test('피자와 1인피자는 피자메뉴로 합산하고 사이드는 별도로 센다', () => {
    const counts = getUsageMenuCounts([
      { menuName: '불고기피자', cat: '피자' },
      { menuName: '고구마피자', cat: '피자' },
      { menuName: '1인 페퍼로니', cat: '1인피자' },
      { menuName: '치즈오븐스파게티', cat: '사이드' },
    ]);

    expect(counts).toEqual({ total: 4, pizza: 3, side: 1 });
  });

  test('같은 메뉴가 여러 식자재 행에 있어도 전체 요약에서는 한 번만 센다', () => {
    const counts = getUsageRowsMenuCounts([
      {
        menus: [
          { menuName: '불고기피자', cat: '피자' },
          { menuName: '감자튀김', cat: '사이드' },
        ],
      },
      {
        menus: [
          { menuName: '불고기피자', cat: '피자' },
          { menuName: '1인 페퍼로니', cat: '1인피자' },
        ],
      },
    ]);

    expect(counts).toEqual({ total: 3, pizza: 2, side: 1 });
  });

  test('제품별 사용현황 PDF 제목과 요약에 다운로드 날짜와 피자/사이드 수를 넣는다', () => {
    const previousWindow = global.window;
    const previousAlert = global.alert;
    const writes = [];

    try {
      global.alert = () => {};
      global.window = {
        open: () => ({
          document: {
            open() {},
            write(html) {
              writes.push(html);
            },
            close() {},
          },
        }),
      };

      printUsageReport(
        [
          {
            name: '테스트 재료',
            code: 'P001',
            count: 3,
            menus: [
              { menuName: '불고기피자', cat: '피자' },
              { menuName: '1인 페퍼로니', cat: '1인피자' },
              { menuName: '감자튀김', cat: '사이드' },
            ],
          },
        ],
        '전체'
      );

      const html = writes.join('');
      expect(html).toContain(`<title>제품별 사용현황_${downloadDateStamp()}</title>`);
      expect(html).toContain('사용 메뉴 3개');
      expect(html).toContain('피자메뉴 2개');
      expect(html).toContain('사이드메뉴 1개');
      expect(html).toContain('<th class="num">피자</th>');
      expect(html).toContain('<th class="num">사이드</th>');
    } finally {
      global.window = previousWindow;
      global.alert = previousAlert;
    }
  });
});
