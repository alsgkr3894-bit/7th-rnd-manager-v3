import { describe, expect, test } from '@jest/globals';
import { downloadDateStamp } from '../../lib/download.js';
import { printUsageReport } from '../../lib/cost/usage-print.js';
import {
  countIngredientsWithQualifyingUsage,
  getUsageMenuCounts,
  getUsageRowsMenuCounts,
} from '../../lib/cost/usage-counts.js';

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

  test('카테고리를 필터링해도 "사용 재료 + 미사용" 합계가 전체 개수와 맞는다', () => {
    // 재현: 피자에만 쓰이는 재료 A, 사이드에만 쓰이는 재료 B, 둘 다 안 쓰이는 재료 C.
    const allMeta = [
      { productCode: 'A', ingredientName: '피자전용재료' },
      { productCode: 'B', ingredientName: '사이드전용재료' },
      { productCode: 'C', ingredientName: '미사용재료' },
    ];
    const usageMap = {
      byCode: new Map([
        ['A', new Map([['불고기피자', '피자']])],
        ['B', new Map([['감자튀김', '사이드']])],
      ]),
      byName: new Map(),
    };

    const total = allMeta.length;

    const usedInAll = countIngredientsWithQualifyingUsage(allMeta, usageMap, {
      usageCat: '전체',
      excludedMenus: new Set(),
    });
    expect(usedInAll).toBe(2); // A, B — 전체 기준으로는 둘 다 "사용"

    // 버그였던 지점: 카테고리를 "피자"로 좁히면 사이드 전용 재료 B는 "이 카테고리 기준"
    // 으로는 미사용이어야 하므로 usedInPizza는 1(A만)이어야 한다.
    const usedInPizza = countIngredientsWithQualifyingUsage(allMeta, usageMap, {
      usageCat: '피자',
      excludedMenus: new Set(),
    });
    expect(usedInPizza).toBe(1);
    // "사용 재료(usedInPizza) + 미사용(total - usedInPizza)"이 항상 전체와 맞아야 한다.
    expect(usedInPizza + (total - usedInPizza)).toBe(total);
  });

  test('제외한 메뉴에서만 쓰이는 재료는 사용으로 세지 않는다', () => {
    const allMeta = [{ productCode: 'A', ingredientName: '재료' }];
    const usageMap = {
      byCode: new Map([['A', new Map([['단종메뉴', '피자']])]]),
      byName: new Map(),
    };
    expect(
      countIngredientsWithQualifyingUsage(allMeta, usageMap, {
        usageCat: '전체',
        excludedMenus: new Set(['단종메뉴']),
      })
    ).toBe(0);
  });

  test('폐기(discontinued) 재료는 사용 여부와 무관하게 집계에서 제외한다', () => {
    const allMeta = [
      { productCode: 'A', ingredientName: '재료', discontinued: true },
      { productCode: 'B', ingredientName: '재료2' },
    ];
    const usageMap = {
      byCode: new Map([
        ['A', new Map([['불고기피자', '피자']])],
        ['B', new Map([['불고기피자', '피자']])],
      ]),
      byName: new Map(),
    };
    // A는 실제 사용 레코드가 있어도 discontinued라 usageRows/unusedRows 어디에도 안
    // 나타난다 — totalUsedCount도 같은 기준이어야 "합계가 전체와 안 맞는" 문제가 안 생긴다.
    expect(
      countIngredientsWithQualifyingUsage(allMeta, usageMap, {
        usageCat: '전체',
        excludedMenus: new Set(),
      })
    ).toBe(1);
  });

  test('자유 검색어와 무관하게(파라미터 자체가 없음) 카테고리·제외메뉴만 반영한다', () => {
    // usageRows/unusedRows와 달리 menuSearch를 받지 않는다 — 검색어를 입력했다고
    // 실제로 쓰이는 재료가 "미사용"으로 잘못 잡히면 안 되기 때문.
    const allMeta = [{ productCode: 'A', ingredientName: '재료' }];
    const usageMap = {
      byCode: new Map([['A', new Map([['불고기피자', '피자']])]]),
      byName: new Map(),
    };
    expect(
      countIngredientsWithQualifyingUsage(allMeta, usageMap, {
        usageCat: '전체',
        excludedMenus: new Set(),
      })
    ).toBe(1);
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
