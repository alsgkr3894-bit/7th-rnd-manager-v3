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
const { exportPriceReportXlsx } = await import('@/lib/report/price-export.js');
const { exportShipmentReportXlsx } = await import('@/lib/report/shipment-export.js');
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
          menuName: '=피자 L',
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
            {
              crustLabel: '석쇠',
              side: 'R',
              weight: 150,
              kcal: 230,
              sugar: 3,
              protein: 11,
              fat: 8,
              sodium: 450,
              allergen: '우유',
            },
            {
              crustLabel: '씬',
              side: 'L',
              weight: 150,
              kcal: 210,
              sugar: 2,
              protein: 10,
              fat: 7,
              sodium: 400,
              allergen: '밀',
            },
          ],
        },
      ],
      pizzaSliceSheet: [
        {
          menuName: '=피자 L',
          rows: [
            {
              crustLabel: '석쇠',
              side: 'L',
              slice: 8,
              servingLabel: '1조각',
              weight: 112,
              kcal: 280,
              sugar: 5,
              protein: 13,
              fat: 10,
              sodium: 520,
              allergen: '밀',
            },
            {
              crustLabel: '석쇠',
              side: 'R',
              slice: 8,
              servingLabel: '1조각',
              weight: 92,
              kcal: 230,
              sugar: 4,
              protein: 10,
              fat: 8,
              sodium: 460,
              allergen: '우유',
            },
            {
              crustLabel: '씬',
              side: 'L',
              slice: 8,
              servingLabel: '1조각',
              weight: 100,
              kcal: 210,
              sugar: 2,
              protein: 10,
              fat: 7,
              sodium: 400,
              allergen: '밀',
            },
          ],
        },
      ],
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
    expect(rowsOf(workbook, '피자')[0]).toEqual([
      '피자',
      '크러스트',
      '총중량',
      '',
      '중량단위',
      '',
      '열량(kcal/150g)',
      '',
      '단백질(g/150g)',
      '',
      '포화지방(g/150g)',
      '',
      '나트륨(mg/150g)',
      '',
      '당류(g/150g)',
      '',
      '함유된 알레르기 유발물질',
    ]);
    expect(rowsOf(workbook, '피자')[1]).toEqual([
      '',
      '',
      'L',
      'R',
      'L',
      'R',
      'L',
      'R',
      'L',
      'R',
      'L',
      'R',
      'L',
      'R',
      'L',
      'R',
      '',
    ]);
    expect(rowsOf(workbook, '피자')[2]).toEqual([
      '=피자',
      '석쇠',
      150,
      150,
      'g',
      'g',
      250,
      230,
      12,
      11,
      9,
      8,
      500,
      450,
      4,
      3,
      '밀, 우유',
    ]);
    expect(rowsOf(workbook, '피자')[3]).toEqual([
      '=피자',
      '씬',
      150,
      '—',
      'g',
      '—',
      210,
      '—',
      10,
      '—',
      7,
      '—',
      400,
      '—',
      2,
      '—',
      '밀',
    ]);
    expect(rowsOf(workbook, '피자(조각)')[0]).toEqual([
      '피자',
      '크러스트',
      '1회중량(g)',
      '',
      '1회조각수',
      '',
      '총조각중량(g)',
      '',
      '열량(kcal/1회분)',
      '',
      '당류(g/1회분)',
      '',
      '단백질(g/1회분)',
      '',
      '포화지방(g/1회분)',
      '',
      '나트륨(mg/1회분)',
      '',
      '함유된 알레르기 유발물질',
    ]);
    expect(rowsOf(workbook, '피자(조각)')[2]).toEqual([
      '=피자',
      '석쇠',
      112,
      92,
      '1조각',
      '1조각',
      896,
      736,
      280,
      230,
      5,
      4,
      13,
      10,
      10,
      8,
      520,
      460,
      '밀, 우유',
    ]);
    expect(rowsOf(workbook, '피자(조각)')[3]).toEqual([
      '=피자',
      '씬',
      100,
      '—',
      '1조각',
      '—',
      800,
      '—',
      210,
      '—',
      2,
      '—',
      10,
      '—',
      7,
      '—',
      400,
      '—',
      '밀',
    ]);
    expect(rowsOf(workbook, '사이드·파스타')[0]).toEqual([
      '메뉴명',
      '1회 중량(g)',
      '열량(kcal/1회분)',
      '당류(g/1회분)',
      '단백질(g/1회분)',
      '포화지방(g/1회분)',
      '나트륨(mg/1회분)',
      '함유된 알레르기 유발물질',
    ]);
    expect(rowsOf(workbook, '사이드·파스타')[1]).toEqual([
      '사이드',
      100,
      200,
      '',
      '',
      '',
      '',
      '대두',
    ]);
    expect(rowsOf(workbook, '음료')[0][1]).toBe('총량(ml)');
    expect(rowsOf(workbook, '세트박스·하프앤하프')[0]).toEqual([
      '메뉴명',
      '사이즈',
      '1회 중량(g)',
      '최소 열량(kcal)',
      '최대 열량(kcal)',
      '함유된 알레르기 유발물질',
    ]);
    expect(workbook.Sheets['피자'].A3).toMatchObject({ t: 's', v: '=피자' });
    expect(workbook.Sheets['피자'].A3.f).toBeUndefined();

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '음료')[0][1]).toBe('총량(ml)');
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
              sourceType: 'direct',
              sourceLabel: '직접 입력',
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
      '직접 입력',
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
    expect(rowsOf(diskWorkbook, '레시피 출력')[1][5]).toBe('치즈');
  });

  test('원가 보고서 XLSX 메뉴 상세는 피자 L/R을 메뉴 한 줄로 출력한다', async () => {
    await exportCostXlsx(
      '2026년 6월',
      [
        [
          'pizza',
          {
            label: '피자',
            menus: [
              {
                code: 'P-OR-010-L',
                name: '샘스테이크 피자 L',
                category: '피자/오리지널',
                size: 'L',
                sale: 32500,
                cost: 10196,
                rate: 31.4,
              },
              {
                code: 'P-OR-010-R',
                name: '샘스테이크 피자 R',
                category: '피자/오리지널',
                size: 'R',
                sale: 25900,
                cost: 7286,
                rate: 28.1,
              },
            ],
          },
        ],
      ],
      [],
      35
    );

    const { workbook } = lastWrite();
    expect(rowsOf(workbook, '메뉴 상세')[0]).toEqual([
      '카테고리',
      '메뉴명',
      'L판매가(원)',
      'L원가(원)',
      'L원가율(%)',
      'R판매가(원)',
      'R원가(원)',
      'R원가율(%)',
      '단일판매가(원)',
      '단일원가(원)',
      '단일원가율(%)',
    ]);
    expect(rowsOf(workbook, '메뉴 상세')[1]).toEqual([
      '피자',
      '샘스테이크 피자',
      32500,
      10196,
      31.4,
      25900,
      7286,
      28.1,
      '',
      '',
      '',
    ]);
  });

  test('제때 가격 보고서 XLSX는 옵션별 시트와 한글 변동 품목을 보존한다', async () => {
    await exportPriceReportXlsx({
      dateRange: '2026-06-01 ~ 2026-06-30',
      opts: { catSummary: true, costImpact: false },
      catSummary: [
        { cat: '전체', total: 1, up: 1, down: 0, newItem: 0, del: 0, sum: 12.5, count: 1 },
      ],
      changes: [
        {
          temperature: '냉장',
          productCode: 'P-001',
          productName: '=치즈 블렌드',
          changeStatus: '인상',
          basePrice: 1000,
          latestPrice: 1125,
          changeRate: 0.125,
        },
      ],
    });

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_2026-06-01 ~ 2026-06-30 제때 가격 변동 보고서_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual(['요약', '전체 식자재 변동 요약', '변동 품목']);
    expect(rowsOf(workbook, '요약')[1]).toEqual(['기간', '2026-06-01 ~ 2026-06-30']);
    expect(rowsOf(workbook, '전체 식자재 변동 요약')[1]).toEqual([
      '전체',
      1,
      1,
      0,
      0,
      0,
      12.5,
    ]);
    expect(rowsOf(workbook, '변동 품목')[1]).toEqual([
      '냉장',
      'P-001',
      '=치즈 블렌드',
      '인상',
      1000,
      1125,
      125,
      12.5,
    ]);
    expect(workbook.Sheets['변동 품목'].C2).toMatchObject({ t: 's', v: '=치즈 블렌드' });
    expect(workbook.Sheets['변동 품목'].C2.f).toBeUndefined();

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '변동 품목')[1][2]).toBe('=치즈 블렌드');
    expect(diskWorkbook.Sheets['변동 품목'].C2.f).toBeUndefined();
  });

  test('제때 출고량 보고서 XLSX는 미리보기 옵션 시트와 한글 품목명을 보존한다', async () => {
    await exportShipmentReportXlsx({
      fileLabel: '2026년 6월',
      scope: 'all',
      opts: {
        chart: true,
        catSummary: true,
        amountSummary: true,
        fullList: true,
        notShippedList: true,
      },
      qtyStats: [
        ['총 출고량', 30],
        ['전용상품', 10],
        ['범용상품', 20],
      ],
      amtStats: [
        ['총 출고금액', 30000],
        ['전용상품 출고금액', 10000],
        ['범용상품 출고금액', 20000],
      ],
      catSummaryRows: [
        ['전용상품', 1, 10, 10000],
        ['범용상품 전체', 1, 20, 20000],
      ],
      chartSeries: [
        { name: '전용상품', data: [7, 10] },
        { name: '범용상품', data: [15, 20] },
      ],
      safeSeriesLabels: ['2026.05', '2026.06'],
      showExclusive: true,
      showGeneric: true,
      exclusive: [
        {
          productType: 'exclusive',
          productCode: 'EX-001',
          normalizedProductName: '=전용 치즈',
          totalQuantity: 10,
          totalAmount: 10000,
        },
      ],
      genericAll: [
        {
          productType: 'generic',
          productCode: 'GN-001',
          normalizedProductName: '범용 소스',
          totalQuantity: 20,
          totalAmount: 20000,
          isManaged: true,
        },
      ],
      managed: [],
      notShipped: [
        {
          productType: 'generic',
          productCode: 'NS-001',
          normalizedProductName: '미출고 토핑',
        },
      ],
    });

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_2026년 6월 제때 출고량 보고서_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual([
      '요약',
      '분류별 합계',
      '월별 출고량 추이',
      '전용상품 목록',
      '범용상품 목록',
      '미출고 품목',
    ]);
    expect(rowsOf(workbook, '분류별 합계')[1]).toEqual(['전용상품', 1, 10, 10000]);
    expect(rowsOf(workbook, '월별 출고량 추이')[2]).toEqual(['2026.06', 10, 20]);
    expect(rowsOf(workbook, '전용상품 목록')[1]).toEqual([
      1,
      '=전용 치즈',
      '전용',
      'EX-001',
      10,
      10000,
    ]);
    expect(rowsOf(workbook, '범용상품 목록')[1][2]).toBe('관리품목');
    expect(workbook.Sheets['전용상품 목록'].B2).toMatchObject({ t: 's', v: '=전용 치즈' });
    expect(workbook.Sheets['전용상품 목록'].B2.f).toBeUndefined();

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '미출고 품목')[1][1]).toBe('미출고 토핑');
    expect(diskWorkbook.Sheets['전용상품 목록'].B2.f).toBeUndefined();
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
