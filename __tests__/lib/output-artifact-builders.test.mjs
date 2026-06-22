import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import XLSX from 'xlsx';

const writes = [];
const outputDir = mkdtempSync(join(tmpdir(), 'output-artifacts-'));
const xlsxMock = {
  ...XLSX,
  utils: XLSX.utils,
  writeFile: jest.fn((workbook, fileName) => {
    const safeName = String(fileName || 'export.xlsx').replace(/[^\w가-힣 ._-]+/g, '_');
    const outputPath = join(outputDir, safeName);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    writeFileSync(outputPath, buffer);
    writes.push({ workbook, fileName, outputPath });
  }),
};

jest.unstable_mockModule('@/lib/excel', () => ({
  loadXlsx: jest.fn(async () => xlsxMock),
}));

jest.unstable_mockModule('@/lib/active-brand', () => ({
  getActiveBrand: () => ({ id: 'test', name: '테스트브랜드' }),
  getActiveBrandId: () => 'test',
}));

const { exportOriginToExcel } = await import('@/lib/nutrition/origin/export.js');
const { exportNutritionLabelToExcel } = await import('@/lib/nutrition/label/export.js');
const { exportSingleMonthXlsx } = await import('@/lib/sales/export-xlsx.js');
const { exportCostXlsx } = await import('@/lib/report/export-cost-xlsx.js');
const { exportReportListToExcel } = await import('@/lib/report/report-list-utils.js');
const { exportSalesReportWorkbook } = await import('@/lib/report/sales-export.js');

function lastWrite() {
  return writes[writes.length - 1];
}

function rowsOf(workbook, sheetName) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
}

function savedWorkbook(write = lastWrite()) {
  return XLSX.readFile(write.outputPath);
}

afterAll(() => {
  rmSync(outputDir, { recursive: true, force: true });
});

describe('출력 artifact builder 실제 workbook 검증', () => {
  beforeEach(() => {
    writes.length = 0;
    xlsxMock.writeFile.mockClear();
  });

  test('원산지 XLSX는 4개 출력 시트와 브랜드/날짜 파일명을 만든다', async () => {
    await exportOriginToExcel(
      {
        sheet1: [{ displayName: '=돼지고기', originCountry: '+국내산', menus: ['페퍼로니피자'] }],
        sheet2: [{ ingredientName: '치즈', itemText: '치즈', originText: '미국산' }],
        sheet3: [{ group: '피자', menuName: '페퍼로니피자', parts: ['치즈(미국산)'] }],
        sheet4: [{ names: '치즈', breakdown: '치즈 : 미국산' }],
      },
      '원산지표시판'
    );

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_원산지표시판_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual([
      '매장비치용',
      '냉장고부착용',
      '배달플랫폼용',
      '원산지정보',
    ]);
    expect(rowsOf(workbook, '매장비치용')[1]).toEqual(['표시품목', '원산지', '음식명']);
    expect(rowsOf(workbook, '매장비치용')[2]).toEqual(['=돼지고기', '+국내산', '페퍼로니피자']);
    expect(workbook.Sheets['매장비치용'].A3).toMatchObject({ t: 's', v: '=돼지고기' });
    expect(workbook.Sheets['매장비치용'].A3.f).toBeUndefined();

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '매장비치용')[2]).toEqual(['=돼지고기', '+국내산', '페퍼로니피자']);
    expect(diskWorkbook.Sheets['매장비치용'].A3.f).toBeUndefined();
  });

  test('영양성분 XLSX는 전 출력 탭을 만들고 음료 헤더를 용량 기준으로 표시한다', async () => {
    await exportNutritionLabelToExcel({
      pizzaSheet: [
        {
          menuName: '=피자',
          rows: [
            {
              crustLabel: '석쇠',
              side: 'L',
              weight: 150,
              kcal: 250,
              sugar: 4,
              protein: 12,
              fat: 9,
              sodium: 500,
              allergen: '밀',
            },
          ],
        },
      ],
      pizzaSliceSheet: [],
      sideSheet: [{ menuName: '사이드', weight: 100, kcal: 200, allergen: '대두' }],
      toppingSheet: [],
      setHalfSheet: [{ menuName: '세트', weight: 300, minKcal: 500, maxKcal: 700, allergen: '밀' }],
      beverageSheet: [{ menuName: '콜라', weight: 355, kcal: 120, sodium: 10, allergen: '' }],
    });

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_제품 영양성분표_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual([
      '피자',
      '피자(조각)',
      '사이드·파스타',
      '추가토핑',
      '세트박스·하프앤하프',
      '음료',
    ]);
    expect(rowsOf(workbook, '피자')[1]).toEqual([
      '메뉴명',
      '크러스트',
      '사이드',
      '1회중량(g)',
      '열량(kcal)',
      '당류(g)',
      '단백질(g)',
      '조지방(g)',
      '나트륨(mg)',
      '함유알레르기',
    ]);
    expect(rowsOf(workbook, '음료')[1][1]).toBe('용량(ml)');
    expect(workbook.Sheets['피자'].A3).toMatchObject({ t: 's', v: '=피자' });
    expect(workbook.Sheets['피자'].A3.f).toBeUndefined();

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '음료')[1][1]).toBe('용량(ml)');
    expect(diskWorkbook.Sheets['피자'].A3.f).toBeUndefined();
  });

  test('판매량 XLSX는 카테고리 비중을 백분율로 쓰고 안전한 시트명을 만든다', async () => {
    await exportSingleMonthXlsx(
      { year: 2026, month: 6 },
      {
        total: 100,
        categories: [
          { name: '피자/오리지널?', value: 25, share: 0.25 },
          { name: '빈분류', value: 0, share: 0 },
        ],
      },
      [{ name: '페퍼로니', category: '피자/오리지널?', quantity: 25 }]
    );

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_2026년06월 메뉴 판매량_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual(['카테고리 요약', '피자_오리지널_', '빈분류']);
    expect(rowsOf(workbook, '카테고리 요약')[1]).toEqual(['피자/오리지널?', 25, 25]);
    expect(rowsOf(workbook, '빈분류')[1]).toEqual(['', '데이터 없음', '', '']);

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '카테고리 요약')[1]).toEqual(['피자/오리지널?', 25, 25]);
  });

  test('원가 보고서 XLSX는 요약·상세·레시피 시트를 만들고 위험 메뉴 임계값을 반영한다', async () => {
    await exportCostXlsx(
      '2026년 6월',
      [
        [
          'pizza',
          {
            label: '피자',
            menus: [
              { code: 'P-002', name: '낮은원가', sale: 10000, cost: 2000, rate: 20 },
              { code: 'P-001', name: '위험원가', sale: 10000, cost: 4200, rate: 42 },
            ],
          },
        ],
      ],
      [
        {
          categoryLabel: '피자',
          menuCode: 'P-001',
          menuName: '위험원가',
          size: 'L',
          totalCost: 1200,
          components: [
            {
              ingredientName: '치즈',
              productCode: 'ING-CHEESE',
              quantity: 10,
              unit: 'g',
              unitPrice: 100,
              subtotal: 1000,
            },
          ],
        },
      ],
      35
    );

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_2026년06월 원가계산 보고서_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual(['카테고리 요약', '메뉴 상세', '레시피 출력']);
    expect(rowsOf(workbook, '카테고리 요약')[1]).toEqual(['피자', 2, 31, 20, 42, 1]);
    expect(rowsOf(workbook, '메뉴 상세')[1][1]).toBe('위험원가');
    expect(rowsOf(workbook, '레시피 출력')[1]).toEqual([
      '피자',
      'P-001',
      '위험원가',
      'L',
      '치즈',
      'ING-CHEESE',
      10,
      'g',
      100,
      1000,
      1200,
      '',
    ]);

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '레시피 출력')[1][4]).toBe('치즈');
  });

  test('보고서 목록 XLSX는 실제 workbook으로 저장되고 문자열 수식 셀을 만들지 않는다', async () => {
    await exportReportListToExcel([
      {
        id: 7,
        kind: 'sales',
        name: '=HYPERLINK("http://bad")',
        period: '+2026년 6월',
        author: '@관리자',
        createdAt: '2026-06-22T01:02:03.000Z',
        views: 3,
        fav: true,
      },
    ]);

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_보고서 목록_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual(['보고서 목록']);
    expect(rowsOf(workbook, '보고서 목록')[0]).toEqual([
      'ID',
      '유형',
      '제목',
      '대상 기간',
      '작성자',
      '생성일',
      '조회수',
      '즐겨찾기',
    ]);
    expect(workbook.Sheets['보고서 목록'].C2).toMatchObject({
      t: 's',
      v: '=HYPERLINK("http://bad")',
    });
    expect(workbook.Sheets['보고서 목록'].C2.f).toBeUndefined();

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(['보고서 목록']);
    expect(diskWorkbook.Sheets['보고서 목록'].C2.f).toBeUndefined();
    expect(rowsOf(diskWorkbook, '보고서 목록')[1][2]).toBe('=HYPERLINK("http://bad")');
  });

  test('판매량 보고서 XLSX는 실제 workbook으로 저장되고 카테고리별 시트를 보존한다', () => {
    exportSalesReportWorkbook(xlsxMock, {
      brandName: '테스트브랜드',
      periodLabel: '2026년 6월',
      scope: '피자',
      kpi: { current: 10, previous: 8, deltaPct: 25 },
      catShares: [{ name: '=피자', value: 10 }],
      groupRanking: [
        {
          rank: 1,
          name: '=슈퍼콤비',
          category: '=피자',
          quantity: 10,
          prevQty: 8,
          delta: 2,
          deltaPct: 25,
        },
      ],
      opts: { prevComp: true },
    });

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_2026년06월 판매량 보고서_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual(['요약', '카테고리별 비중', '전체 메뉴 순위', '=피자']);
    expect(rowsOf(workbook, '카테고리별 비중')[1]).toEqual(['=피자', 10, '100.0']);
    expect(workbook.Sheets['전체 메뉴 순위'].B2).toMatchObject({ t: 's', v: '=슈퍼콤비' });
    expect(workbook.Sheets['전체 메뉴 순위'].B2.f).toBeUndefined();

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '전체 메뉴 순위')[1][1]).toBe('=슈퍼콤비');
    expect(diskWorkbook.Sheets['전체 메뉴 순위'].B2.f).toBeUndefined();
  });
});
