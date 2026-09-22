import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import XLSX from 'xlsx';
import XLSX_STYLED from 'xlsx-js-style';

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

// 테두리 등 셀 스타일을 실제로 쓰는 writer(xlsx-js-style) — 원산지 출력이 쓴다.
const xlsxStyledMock = {
  ...XLSX_STYLED,
  utils: XLSX_STYLED.utils,
  writeFile: jest.fn((workbook, fileName) => {
    const safeName = String(fileName || 'export.xlsx').replace(/[^\w가-힣 ._-]+/g, '_');
    const outputPath = join(outputDir, safeName);
    writeFileSync(outputPath, XLSX_STYLED.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    writes.push({ workbook, fileName, outputPath });
  }),
};

jest.unstable_mockModule('@/lib/excel', () => ({
  loadXlsx: jest.fn(async () => xlsxMock),
  loadXlsxStyled: jest.fn(async () => xlsxStyledMock),
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

// xlsx = zip. 라이브러리 없이 로컬 파일 헤더를 따라가며 원하는 항목 하나만 inflate한다.
async function readZipEntry(path, entryName) {
  const { readFileSync } = await import('node:fs');
  const { inflateRawSync } = await import('node:zlib');
  const buf = readFileSync(path);
  let offset = 0;
  while (offset + 30 <= buf.length && buf.readUInt32LE(offset) === 0x04034b50) {
    const method = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const nameLength = buf.readUInt16LE(offset + 26);
    const extraLength = buf.readUInt16LE(offset + 28);
    const name = buf.toString('utf8', offset + 30, offset + 30 + nameLength);
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = buf.subarray(dataStart, dataStart + compressedSize);
    if (name === entryName) {
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`${entryName} not found in ${path}`);
}

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
        sheet4: [
          { names: '도우', breakdown: '밀 : 미국산, 캐나다산 섞음', pizzaCommon: true },
          { names: '치즈', breakdown: '치즈 : 미국산', pizzaCommon: false },
        ],
      },
      '원산지표시판'
    );

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_원산지표시판_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual([
      '원산지(매장)',
      '원산지(냉장고)',
      '배달플랫폼용',
      '원산지정보',
    ]);
    const store = workbook.Sheets['원산지(매장)'];
    expect(rowsOf(workbook, '원산지(매장)')[0]).toEqual(['원산지 표시판']);
    expect(rowsOf(workbook, '원산지(매장)')[1]).toEqual(['표시품목', '원산지', '메뉴명']);
    expect(store['!merges'][0]).toEqual({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });
    expect(rowsOf(workbook, '원산지(매장)')[2]).toEqual(['=돼지고기', '+국내산', '페퍼로니피자']);
    expect(store.A3).toMatchObject({ t: 's', v: '=돼지고기' });
    expect(store.A3.f).toBeUndefined();
    // 2026-09-22: 표 칸 테두리 — 헤더·데이터 셀 전부, 제목 행은 제외
    expect(store.A2.s.border.top).toEqual({ style: 'thin', color: { rgb: '000000' } });
    expect(store.C3.s.border.bottom.style).toBe('thin');
    expect(store.A2.s.font.bold).toBe(true);
    expect(store.A1.s.border).toBeUndefined();
    expect(rowsOf(workbook, '원산지(냉장고)')[1]).toEqual(['음식명', '표시품목', '원산지']);
    // 원산지정보: 제목 + 표기문 셀 하나("※ 피자공통" 줄 / 공통 재료 / 빈 줄 / 나머지 문단)
    expect(rowsOf(workbook, '원산지정보')[0]).toEqual(['원산지']);
    expect(rowsOf(workbook, '원산지정보')[1]).toEqual([
      '※ 피자공통\n도우(밀 : 미국산, 캐나다산 섞음)\n\n치즈(치즈 : 미국산)',
    ]);
    expect(workbook.Sheets['원산지정보'].A2.s.alignment.wrapText).toBe(true);
    expect(workbook.Sheets['원산지정보'].A2.s.border.left.style).toBe('thin');

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(workbook.SheetNames);
    expect(rowsOf(diskWorkbook, '원산지(매장)')[2]).toEqual([
      '=돼지고기',
      '+국내산',
      '페퍼로니피자',
    ]);
    expect(diskWorkbook.Sheets['원산지(매장)'].A3.f).toBeUndefined();
    // 파일에도 테두리가 실제로 기록됐는지(xlsx 커뮤니티판 writer는 s를 조용히 버린다) —
    // xlsx 계열 reader는 스타일을 복원하지 않으므로 xl/styles.xml을 직접 본다.
    const stylesXml = await readZipEntry(lastWrite().outputPath, 'xl/styles.xml');
    expect(stylesXml).toMatch(/<top style="thin">/);
    expect(stylesXml).toMatch(/<bottom style="thin">/);
  });

  // 2026-09-22 주임님 양식(통합 문서3.xlsx): 시트 1개에 제목 → Pizza(L/R 쌍, 메뉴명 세로 병합,
  // 1인용은 "씬바샤삭(1인용)") → 추가 토핑 → Side → Pasta → Beverage(같은 음료 용량 병합)
  // → Set Box → 하프앤하프 → 원산지 표기문 → 주석 4줄 → 기준월. A열은 비우고 B열부터, 표 칸 전부 테두리.
  const labelInput = {
    pizzaSheet: [
      {
        menuName: '포크 피자 L',
        menuCode: 'P-OR-001',
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
        ],
      },
    ],
    pizzaSliceSheet: [
      {
        menuName: '포크 피자',
        menuCode: 'P-OR-001',
        rows: [
          {
            crustLabel: '석쇠',
            side: 'L',
            slice: 8,
            servingLabel: '1조각',
            weight: 112,
            totalWeight: 896,
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
            slice: 6,
            servingLabel: '1조각',
            weight: 92,
            totalWeight: 552,
            kcal: 230,
            sugar: 4,
            protein: 10,
            fat: 8,
            sodium: 460,
            allergen: '우유',
          },
          {
            crustLabel: '씬바샤삭',
            side: 'L',
            slice: 8,
            servingLabel: '1조각',
            weight: 100,
            totalWeight: 800,
            kcal: 210,
            sugar: 2,
            protein: 10,
            fat: 7,
            sodium: 400,
            allergen: '밀',
          },
        ],
      },
      {
        menuName: '하와이안 피자(1인)',
        menuCode: 'P-ONE-001',
        rows: [
          {
            crustLabel: '1인용피자',
            side: 'L',
            slice: 6,
            servingLabel: '6조각',
            weight: 255,
            totalWeight: 255,
            kcal: 640,
            sugar: 9,
            protein: 30,
            fat: 12,
            sodium: 1100,
            allergen: '밀, 우유',
          },
        ],
      },
    ],
    sideSheet: [
      {
        menuName: '핫윙 (4pcs)',
        weight: 138,
        kcal: 279,
        sugar: 3,
        protein: 29,
        fat: 5,
        sodium: 763,
        allergen: '밀, 닭고기',
      },
      {
        menuName: '오븐 스파게티',
        weight: 432,
        kcal: 627,
        sugar: 7,
        protein: 28,
        fat: 10,
        sodium: 1474,
        allergen: '밀',
      },
    ],
    toppingSheet: [
      {
        menuName: '치즈 80g',
        weight: 80,
        kcal: 246,
        sugar: 0,
        protein: 20,
        fat: 10,
        sodium: 372,
        allergen: '우유',
      },
    ],
    setHalfSheet: [
      {
        kind: 'set',
        side: 'L',
        menuName: '패밀리박스 L세트',
        weight: 299,
        minKcal: 3741,
        maxKcal: 5573,
        allergen: '',
      },
      {
        kind: 'half',
        side: 'R',
        menuName: '하프앤하프 R',
        weight: '90~110',
        minKcal: 1236,
        maxKcal: 2392,
        allergen: '',
      },
    ],
    beverageSheet: [
      {
        menuName: '코카콜라355ml',
        menuCode: 'D-CC-001-355',
        weight: 355,
        kcal: 152,
        sugar: 38,
        protein: 0,
        fat: 0,
        sodium: 11,
      },
      {
        menuName: '코카콜라1.25L',
        menuCode: 'D-CC-001-1250',
        weight: 1250,
        kcal: 550,
        sugar: 138,
        protein: 0,
        fat: 0,
        sodium: 38,
      },
      {
        menuName: '환타(오렌지)355ml',
        menuCode: 'D-FO-001-355',
        weight: 355,
        kcal: 164,
        sugar: 41,
        protein: 0,
        fat: 0,
        sodium: 11,
      },
    ],
    originStatementSheet: [
      { names: '도우', breakdown: '밀 : 미국산, 캐나다산 섞음', pizzaCommon: true },
      { names: '베이컨', breakdown: '돼지고기 : 미국산', pizzaCommon: false },
    ],
  };

  test('영양성분 XLSX는 양식대로 시트 하나에 세로로 쌓고(조각 기준 기본) 칸마다 테두리를 친다', async () => {
    await exportNutritionLabelToExcel(labelInput);

    const { workbook, fileName } = lastWrite();
    expect(fileName).toMatch(/^테스트브랜드_제품 영양성분표_\d{8}\.xlsx$/);
    expect(workbook.SheetNames).toEqual(['영양성분_알레르기']);
    const ws = workbook.Sheets['영양성분_알레르기'];
    const rows = rowsOf(workbook, '영양성분_알레르기');
    const findRow = text => rows.findIndex(row => row[1] === text);

    // 제목: B2, 표 전체 폭으로 병합
    expect(rows[1][1]).toBe('제품영양성분 / 알레르기 유발 성분');
    expect(ws['!merges']).toContainEqual({ s: { r: 1, c: 1 }, e: { r: 1, c: 19 } });

    // Pizza 헤더 2행 + L/R
    const pizzaHead = findRow('Pizza');
    expect(rows[pizzaHead].slice(1)).toEqual([
      'Pizza',
      '',
      '1회 중량(g)',
      '',
      '1회 조각수',
      '',
      '총 조각 중량 (g)',
      '',
      '열량 (kcal/1회분)',
      '',
      '당류 (g/1회분)',
      '',
      '단백질 (g/1회분)',
      '',
      '포화지방 (g/1회분)',
      '',
      '나트륨 (mg/1회분)',
      '',
      '함유된 알레르기 유발물질',
    ]);
    expect(rows[pizzaHead + 1].slice(3, 7)).toEqual(['L', 'R', 'L', 'R']);
    expect(ws['!merges']).toContainEqual({ s: { r: pizzaHead, c: 3 }, e: { r: pizzaHead, c: 4 } });
    expect(ws['!merges']).toContainEqual({
      s: { r: pizzaHead, c: 19 },
      e: { r: pizzaHead + 1, c: 19 },
    });

    // 메뉴 행: 이름은 첫 크러스트 행에만, 세로 병합, "피자" 단어 제거, 씬바샤삭 R은 빈칸
    expect(rows[pizzaHead + 2].slice(1, 9)).toEqual([
      '포크',
      '석쇠',
      112,
      92,
      '1조각',
      '1조각',
      896,
      552,
    ]);
    expect(rows[pizzaHead + 3].slice(1, 5)).toEqual(['', '씬바샤삭', 100, '']);
    expect(rows[pizzaHead + 2][19]).toBe('밀, 우유');
    expect(ws['!merges']).toContainEqual({
      s: { r: pizzaHead + 2, c: 1 },
      e: { r: pizzaHead + 3, c: 1 },
    });
    // 1인용: 이름에서 "(1인)"을 떼고 크러스트에 "씬바샤삭(1인용)"
    expect(rows[pizzaHead + 4].slice(1, 6)).toEqual([
      '하와이안',
      '씬바샤삭(1인용)',
      255,
      '',
      '6조각',
    ]);

    // 추가 토핑 / Side / Pasta 분리
    expect(rows[findRow('추가 토핑')].slice(1, 3)).toEqual(['추가 토핑', '1회 중량 (g)']);
    expect(rows[findRow('추가 토핑') + 1].slice(1, 4)).toEqual(['치즈 80g', 80, 246]);
    expect(rows[findRow('Side') + 1][1]).toBe('핫윙 (4pcs)');
    expect(rows[findRow('Pasta')].slice(1, 3)).toEqual(['Pasta', '총 중량 (g)']);
    expect(rows[findRow('Pasta') + 1][1]).toBe('오븐 스파게티');

    // Beverage: 알레르기 열 없음, 같은 음료는 용량 내림차순 + 이름 세로 병합
    const bev = findRow('Beverage');
    expect(rows[bev].slice(1)).toEqual([
      'Beverage',
      '총 용량 (ml)',
      '열량 (kcal/1회분)',
      '당류 (g/1회분)',
      '단백질 (g/1회분)',
      '포화지방 (g/1회분)',
      '나트륨 (mg/1회분)',
    ]);
    expect(rows[bev + 1].slice(1, 3)).toEqual(['코카콜라', 1250]);
    expect(rows[bev + 2].slice(1, 3)).toEqual(['', 355]);
    expect(rows[bev + 3].slice(1, 3)).toEqual(['환타(오렌지)', 355]);
    expect(ws['!merges']).toContainEqual({ s: { r: bev + 1, c: 1 }, e: { r: bev + 2, c: 1 } });

    // Set Box / 하프앤하프
    expect(rows[findRow('Set Box')].slice(1)).toEqual([
      'Set Box',
      '최소 열량 (kcal)',
      '최대 열량 (kcal)',
      '1회 중량 (g)',
    ]);
    expect(rows[findRow('Set Box') + 1].slice(1)).toEqual(['패밀리박스 (L)', 3741, 5573, 299]);
    expect(rows[findRow('하프앤하프') + 1].slice(1)).toEqual([
      '하프앤하프 (R)',
      1236,
      2392,
      '90~110',
    ]);

    // 원산지 표기문 셀 + 주석 + 기준월
    const origin = findRow('원산지');
    expect(rows[origin + 1][1]).toBe(
      '※ 피자공통\n도우(밀 : 미국산, 캐나다산 섞음)\n\n베이컨(돼지고기 : 미국산)'
    );
    expect(
      rows[
        findRow('1.위 제품은 재료의 수급 상황에 따라 구성 성분이 다소 차이가 날 수 있습니다.') + 3
      ][1]
    ).toMatch(/^4\.위 원산지/);
    expect(rows[rows.length - 1][1]).toMatch(/^\d{4}년 \d{1,2}월 기준$/);

    // 테두리: 헤더·데이터 칸(병합 범위의 빈 칸 포함), 제목 행은 제외
    const at = (r, c) => ws[XLSX.utils.encode_cell({ r, c })];
    expect(at(pizzaHead, 1).s.border.top.style).toBe('thin');
    expect(at(pizzaHead, 2).s.border.left.style).toBe('thin');
    expect(at(pizzaHead + 3, 1).s.border.bottom.style).toBe('thin');
    expect(at(pizzaHead, 1).s.font.bold).toBe(true);
    expect(at(1, 1).s.border).toBeUndefined();
    expect(at(1, 1).s.font.sz).toBe(14);
    expect(at(pizzaHead + 2, 1).f).toBeUndefined();

    const diskWorkbook = savedWorkbook();
    expect(diskWorkbook.SheetNames).toEqual(['영양성분_알레르기']);
    expect(rowsOf(diskWorkbook, '영양성분_알레르기')[pizzaHead + 2][1]).toBe('포크');
    const stylesXml = await readZipEntry(lastWrite().outputPath, 'xl/styles.xml');
    expect(stylesXml).toMatch(/<left style="thin">/);
  });

  test('영양성분 XLSX는 150g 기준을 고르면 Pizza 블록만 150g 열로 바뀐다', async () => {
    await exportNutritionLabelToExcel({ ...labelInput, basis: '150g' });
    const rows = rowsOf(lastWrite().workbook, '영양성분_알레르기');
    const pizzaHead = rows.findIndex(row => row[1] === 'Pizza');
    expect(rows[pizzaHead].slice(1, 6)).toEqual([
      'Pizza',
      '',
      '기준중량(g)',
      '',
      '열량 (kcal/150g)',
    ]);
    expect(rows[pizzaHead + 2].slice(1, 6)).toEqual(['포크', '석쇠', 150, 150, 250]);
    expect(rows.findIndex(row => row[1] === 'Beverage')).toBeGreaterThan(pizzaHead);
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
    expect(fileName).toMatch(
      /^테스트브랜드_2026-06-01 ~ 2026-06-30 제때 가격 변동 보고서_\d{8}\.xlsx$/
    );
    expect(workbook.SheetNames).toEqual(['요약', '전체 식자재 변동 요약', '변동 품목']);
    expect(rowsOf(workbook, '요약')[1]).toEqual(['기간', '2026-06-01 ~ 2026-06-30']);
    expect(rowsOf(workbook, '전체 식자재 변동 요약')[1]).toEqual(['전체', 1, 1, 0, 0, 0, 12.5]);
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
