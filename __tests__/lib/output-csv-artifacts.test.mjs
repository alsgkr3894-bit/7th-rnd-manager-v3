import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import XLSX from 'xlsx';

const csvDownloads = [];
const excelWrites = [];
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
  makeFileNameWithBrand: jest.fn((prefix, ext) => `테스트브랜드_${prefix}.${ext}`),
}));

jest.unstable_mockModule('@/lib/excel', () => ({
  loadXlsx: jest.fn(async () => xlsxMock),
}));

const { exportMenuMasterCsv } = await import('@/app/menu-master/menuMasterExport.js');
const { exportMarginExcel } = await import('@/lib/cost/margin/export.js');
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
      },
    ]);

    const { rows, fileName } = lastDownload();
    expect(fileName).toBe('테스트브랜드_메뉴마스터.csv');
    expect(rows).toEqual([
      ['메뉴코드', '메뉴명', '규격', '판매가', '상태', '카테고리'],
      ['=P-001', '+테스트피자', 'L', 19900, '판매', '피자'],
    ]);
  });

  test('원가마진표 XLSX는 사이즈별 원가·판매가·원가율 컬럼을 만든다', async () => {
    await exportMarginExcel(
      [
        {
          menuName: '페퍼로니',
          menuCategory: '피자',
          costMap: { L: 2500, R: 1800 },
          sizes: [
            { label: 'L', sellingPrice: 10000 },
            { label: 'R', sellingPrice: 9000 },
          ],
        },
      ],
      ['L', 'R'],
      'cost',
      { fees: [] },
      0
    );

    const { workbook, fileName } = lastExcelWrite();
    expect(fileName).toBe('테스트브랜드_원가마진표.xlsx');
    expect(workbook.SheetNames).toEqual(['원가마진표']);
    const rows = rowsOf(workbook, '원가마진표');
    expect(rows[0]).toEqual([
      '메뉴명',
      '카테고리',
      'L 원가',
      'R 원가',
      'L 판매가',
      'R 판매가',
      'L 원가율',
      'R 원가율',
    ]);
    expect(rows[1]).toEqual(['페퍼로니', '피자', 2500, 1800, 10000, 9000, '25.0%', '20.0%']);
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
