import { describe, expect, test } from '@jest/globals';
import { pickPriceReportFiles, shiftDateString } from '../../lib/report/price-period.js';
import { buildPriceCostImpact } from '../../lib/report/price-cost-impact.js';
import { buildPriceReportWorkbookSheets } from '../../lib/report/price-export.js';

// 2026-10-30: '이번 주'와 '이번 달'이 둘 다 최근 두 파일을 비교하던 것, '원가 영향 메뉴 수' 옵션이
// 상태별 건수만 보여주던 것을 고쳤다.
const file = (id, updateDate) => ({ id, updateDate });
const FILES = [
  file(22, '2026-10-20'),
  file(21, '2026-10-13'),
  file(20, '2026-10-01'),
  file(19, '2026-09-29'),
  file(18, '2026-09-22'),
];

describe('가격 보고서 비교 파일 선택', () => {
  test('이번 주: 최신 파일보다 7일 이상 앞선 가장 최근 파일', () => {
    const { latest, base } = pickPriceReportFiles(FILES, { mode: 'week' });
    expect(latest.id).toBe(22);
    expect(base.id).toBe(21); // 10-13 = 10-20 − 7일
  });

  test('이번 달: 최신 파일이 속한 달 직전의 마지막 파일(월초 가격)', () => {
    const { latest, base } = pickPriceReportFiles(FILES, { mode: 'month' });
    expect(latest.id).toBe(22);
    expect(base.id).toBe(19); // 9월 마지막 파일 (10-01은 이번 달)
  });

  test('이번 주와 이번 달이 같은 결과가 아니다', () => {
    const week = pickPriceReportFiles(FILES, { mode: 'week' });
    const month = pickPriceReportFiles(FILES, { mode: 'month' });
    expect(week.base.id).not.toBe(month.base.id);
  });

  test('7일 이상 앞선 파일이 없으면 바로 앞 파일로 비교한다', () => {
    const files = [file(2, '2026-10-20'), file(1, '2026-10-18')];
    expect(pickPriceReportFiles(files, { mode: 'week' }).base.id).toBe(1);
  });

  test('이전 달 파일이 없으면 그 달의 가장 이른 파일과 비교한다', () => {
    const files = [file(3, '2026-10-20'), file(2, '2026-10-13'), file(1, '2026-10-01')];
    expect(pickPriceReportFiles(files, { mode: 'month' }).base.id).toBe(1);
  });

  test('사용자 지정: 기간 끝 이전의 최신 파일 vs 시작일 이전의 가장 최근 파일', () => {
    const { latest, base } = pickPriceReportFiles(FILES, {
      mode: 'custom',
      from: '2026-09-30',
      to: '2026-10-14',
    });
    expect(latest.id).toBe(21);
    expect(base.id).toBe(19);
  });

  test('파일이 2개 미만이면 안내 오류', () => {
    expect(() => pickPriceReportFiles([file(1, '2026-10-01')], { mode: 'week' })).toThrow(
      '2개 이상'
    );
  });

  test('날짜 계산은 달력 기준', () => {
    expect(shiftDateString('2026-10-03', -7)).toBe('2026-09-26');
    expect(shiftDateString('bad', -7)).toBe('');
  });
});

describe('가격 변동의 원가 영향 메뉴', () => {
  const ingredients = [
    { id: 1, productCode: 'CHZ', ingredientName: '치즈', baseQuantity: 1000, baseUnitType: 'g' },
    { id: 2, productCode: 'SAU', ingredientName: '소스', baseQuantity: 1000, baseUnitType: 'g' },
  ];
  const row = (productCode, priceWithTax) => ({ productCode, priceWithTax });
  const baseRows = [row('CHZ', 10000), row('SAU', 5000)];
  const latestRows = [row('CHZ', 12000), row('SAU', 5000)];
  const recipe = (menuCode, menuName, components) => ({
    menuCode,
    menuName,
    category: '피자',
    size: menuCode.endsWith('R') ? 'R' : 'L',
    components,
  });
  const detailMaps = {
    pizza: new Map([
      [
        'P-1-L',
        recipe('P-1-L', '치즈피자', [
          { ingredientName: '치즈', productCode: 'CHZ', quantity: 100 },
          { ingredientName: '소스', productCode: 'SAU', quantity: 50 },
        ]),
      ],
      [
        'P-2-L',
        recipe('P-2-L', '소스피자', [{ ingredientName: '소스', productCode: 'SAU', quantity: 80 }]),
      ],
    ]),
  };

  test('단가가 바뀐 식자재를 쓰는 메뉴만, 이전·현재 원가와 원인 식자재와 함께 돌려준다', () => {
    const result = buildPriceCostImpact({ baseRows, latestRows, ingredients, detailMaps });
    expect(result.menus).toHaveLength(1);
    expect(result.menus[0]).toMatchObject({
      name: '치즈피자',
      before: 1250,
      after: 1450,
      diff: 200,
      causes: ['치즈'],
    });
    expect(result.menus[0].rate).toBeCloseTo(16, 5);
    expect(result.up).toBe(1);
    expect(result.down).toBe(0);
  });

  test('가격이 내려가면 하락으로 센다', () => {
    const result = buildPriceCostImpact({
      baseRows: latestRows,
      latestRows: baseRows,
      ingredients,
      detailMaps,
    });
    expect(result.menus[0].diff).toBe(-200);
    expect(result.down).toBe(1);
  });

  test('단종 메뉴는 제외하고, 변동이 없으면 빈 목록', () => {
    expect(
      buildPriceCostImpact({
        baseRows,
        latestRows,
        ingredients,
        detailMaps,
        excludeMenuCodes: new Set(['P-1-L']),
      }).menus
    ).toEqual([]);
    expect(
      buildPriceCostImpact({ baseRows, latestRows: baseRows, ingredients, detailMaps }).menus
    ).toEqual([]);
  });

  test('엑셀 시트: 옵션을 켜면 메뉴별 표가 들어가고 건수만 있는 시트는 없다', () => {
    const costImpact = buildPriceCostImpact({ baseRows, latestRows, ingredients, detailMaps });
    const sheets = buildPriceReportWorkbookSheets({
      dateRange: '2026-10-13 ~ 2026-10-20',
      changes: [],
      catSummary: [],
      costImpact,
      opts: { catSummary: false, costImpact: true },
    });
    const sheet = sheets.find(s => s.name === '원가 영향 메뉴');
    expect(sheet).toBeTruthy();
    expect(sheets.some(s => s.name === '원가 영향 식자재')).toBe(false);
    expect(sheet.rows[0]).toContain('원인 식자재');
    expect(sheet.rows[1]).toEqual(['피자', 'P-1-L', '치즈피자', 'L', 1250, 1450, 200, 16, '치즈']);
  });
});
