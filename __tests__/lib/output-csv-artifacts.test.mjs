import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import XLSX from 'xlsx';

const csvDownloads = [];
const excelWrites = [];
const MOCK_DATE = new Date('2026-06-11T00:00:00');

function mockDateStamp(date = MOCK_DATE) {
  const safeDate = date instanceof Date && Number.isFinite(date.getTime()) ? date : MOCK_DATE;
  const pad = value => String(value).padStart(2, '0');
  return `${safeDate.getFullYear()}${pad(safeDate.getMonth() + 1)}${pad(safeDate.getDate())}`;
}

function mockDisplayDate(date = MOCK_DATE) {
  const stamp = mockDateStamp(date);
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
}

const xlsxMock = {
  ...XLSX,
  utils: XLSX.utils,
  writeFile: jest.fn((workbook, fileName) => {
    excelWrites.push({ workbook, fileName });
  }),
};

jest.unstable_mockModule('@/lib/download', () => ({
  downloadCsv: jest.fn((rows, fileName) => {
    csvDownloads.push({ rows, fileName });
  }),
  makeFileNameWithBrand: jest.fn(
    (prefix, ext, date = MOCK_DATE) => `테스트브랜드_${prefix}_${mockDateStamp(date)}.${ext}`
  ),
}));

jest.unstable_mockModule('@/lib/excel', () => ({
  loadXlsx: jest.fn(async () => xlsxMock),
}));

const { exportMenuMasterCsv } = await import('@/app/menu-master/menuMasterExport.js');
const { buildMarginPrintHtml, exportMarginExcel } = await import('@/lib/cost/margin/export.js');
const { buildAllergenCsvRows } =
  await import('@/app/nutrition/allergen/allergenPageOutputUtils.js');

function lastDownload() {
  return csvDownloads[csvDownloads.length - 1];
}

function lastExcelWrite() {
  return excelWrites[excelWrites.length - 1];
}

function rowsOf(workbook, sheetName) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
}

function headerIndex(rows) {
  return rows.findIndex(row => row?.[0] === '카테고리');
}

describe('출력 artifact 실행 검증', () => {
  beforeEach(() => {
    csvDownloads.length = 0;
    excelWrites.length = 0;
    xlsxMock.writeFile.mockClear();
  });

  test('메뉴마스터 CSV는 브랜드 파일명과 메뉴 기본 컬럼을 만든다', () => {
    exportMenuMasterCsv([
      {
        menuCode: '=P-001',
        menuName: '+테스트피자',
        size: 'L',
        price: 19900,
        status: '판매',
        category: '피자',
        subCategory: '오리지널',
      },
    ]);

    const { rows, fileName } = lastDownload();
    expect(fileName).toBe('테스트브랜드_메뉴마스터_20260611.csv');
    expect(rows).toEqual([
      ['메뉴코드', '메뉴명', '규격', '판매가', '상태', '카테고리', '중분류'],
      ['=P-001', '+테스트피자', 'L', 19900, '판매', '피자', '오리지널'],
    ]);
  });

  test('원가마진표 XLSX는 사이즈별 판매가·원가·원가율 컬럼을 만든다', async () => {
    await exportMarginExcel(
      [
        {
          menuName: '페퍼로니',
          menuCategory: '피자',
          menuSubCategory: '오리지널',
          menuSubCategoryCode: 'OR',
          costMap: { L: 2500, R: 1800 },
          sizes: [
            { label: 'L', sellingPrice: 10000 },
            { label: 'R', sellingPrice: 9000 },
          ],
        },
        {
          menuName: '치즈오븐스파게티',
          menuCategory: '사이드',
          costMap: { L: 1200 },
          sizes: [{ label: 'L', sellingPrice: 6000 }],
        },
      ],
      ['L', 'R'],
      'cost',
      { fees: [] },
      0,
      { now: MOCK_DATE }
    );

    const { workbook, fileName } = lastExcelWrite();
    expect(fileName).toBe('테스트브랜드_원가마진표_20260611.xlsx');
    expect(workbook.SheetNames).toEqual(['원가마진표', '피자', '사이드']);
    const rows = rowsOf(workbook, '원가마진표');
    expect(rows[0]).toEqual(['다운로드일', '2026-06-11']);
    expect(rows[1]).toEqual(['플랫폼', '기본']);
    expect(rows[2]).toEqual(['보기 기준', '원가율']);
    expect(rows[3]).toEqual(['할인', '없음']);
    const mainHeaderIndex = headerIndex(rows);
    expect(rows[mainHeaderIndex]).toEqual([
      '카테고리',
      '메뉴명',
      'L 판매가',
      'R 판매가',
      'L 원가',
      'R 원가',
      'L 원가율',
      'R 원가율',
    ]);
    expect(rows[mainHeaderIndex + 1]).toEqual([
      '피자',
      '페퍼로니',
      10000,
      9000,
      2500,
      1800,
      '25.0%',
      '20.0%',
    ]);
    const pizzaRows = rowsOf(workbook, '피자');
    const pizzaHeaderIndex = headerIndex(pizzaRows);
    expect(pizzaRows[0]).toEqual(['다운로드일', '2026-06-11']);
    expect(pizzaRows[pizzaHeaderIndex]).toEqual([
      '카테고리',
      '메뉴명',
      'L 판매가',
      'R 판매가',
      'L 원가',
      'R 원가',
      'L 원가율',
      'R 원가율',
    ]);
    expect(pizzaRows[pizzaHeaderIndex + 1]).toEqual([
      '피자',
      '페퍼로니',
      10000,
      9000,
      2500,
      1800,
      '25.0%',
      '20.0%',
    ]);
    const sideRows = rowsOf(workbook, '사이드');
    const sideHeaderIndex = headerIndex(sideRows);
    expect(sideRows[0]).toEqual(['다운로드일', '2026-06-11']);
    expect(sideRows[sideHeaderIndex]).toEqual([
      '카테고리',
      '메뉴명',
      '단일 판매가',
      '단일 원가',
      '단일 원가율',
    ]);
    expect(sideRows[sideHeaderIndex + 1]).toEqual([
      '사이드',
      '치즈오븐스파게티',
      6000,
      1200,
      '20.0%',
    ]);
  });

  test('원가마진표 PDF HTML은 현재 행을 카테고리별로 출력하고 값을 escape한다', () => {
    const html = buildMarginPrintHtml(
      [
        {
          menuName: '<테스트피자>',
          menuCategory: '피자',
          menuSubCategory: '오리지널',
          menuSubCategoryCode: 'OR',
          costMap: { L: 2500, R: 1800 },
          sizes: [
            { label: 'L', sellingPrice: 10000 },
            { label: 'R', sellingPrice: 9000 },
          ],
        },
        {
          menuName: '치즈오븐스파게티',
          menuCategory: '사이드',
          costMap: { L: 1200 },
          sizes: [{ label: 'L', sellingPrice: 6000 }],
        },
      ],
      ['L', 'R'],
      'cost',
      { name: '배달앱', fees: [] },
      null,
      { now: MOCK_DATE }
    );

    expect(html).toContain('<title>테스트브랜드_원가마진표_20260611</title>');
    expect(html).toContain('메뉴 원가마진표');
    expect(html).toContain(`다운로드일: ${mockDisplayDate()}`);
    expect(html).toContain(`<span>다운로드일</span><strong>${mockDisplayDate()}</strong>`);
    expect(html).toContain('플랫폼: 배달앱');
    expect(html).toContain('<h2>피자</h2>');
    expect(html).toContain('<h2>사이드</h2>');
    expect(html).toContain('L 원가');
    expect(html).toContain('R 원가율');
    expect(html).not.toContain('OR 오리지널');
    expect(html).toContain('25.0%');
    expect(html).toContain('&lt;테스트피자&gt;');
    expect(html).not.toContain('<테스트피자>');
    expect(html).toContain('치즈오븐스파게티');
  });

  test('알레르기 CSV row builder는 메뉴·크러스트·알레르기 매트릭스를 보존한다', () => {
    const rows = buildAllergenCsvRows(
      [
        {
          menuName: '=위험메뉴명',
          crust: '석쇠',
          allergenCodes: new Set(['AL01', 'AL03']),
        },
      ],
      [
        { allergenCode: 'AL01', allergenName: '난류' },
        { allergenCode: 'AL02', allergenName: '우유' },
        { allergenCode: 'AL03', allergenName: '밀' },
      ]
    );

    expect(rows).toEqual([
      ['메뉴명', '크러스트', '난류', '우유', '밀'],
      ['=위험메뉴명', '석쇠', '●', '', '●'],
    ]);
  });
});
