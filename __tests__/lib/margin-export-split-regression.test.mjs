/**
 * 원가마진표 내보내기 분리 회귀 테스트 (lib/cost/margin/export.js → export-format/rows/sheets/print.js).
 *
 * 재export 허브로 나눈 뒤에도 PDF HTML·엑셀 행·워크북·파일명·다운로드일 포맷이 분리 전과
 * 완전히 같은 값을 내는지 확인한다. cost/margin 뷰, 할인 3종(없음·정률·정액·잘못된 값),
 * 플랫폼(기본/배달의민족), 카테고리 5종(피자·프리미엄·사이드·기타·음료), 원가 누락/문자열
 * 케이스를 전부 조합해 직렬화한 뒤 해시로 고정한다 — 값 하나라도 바뀌면 이 테스트가 실패한다.
 */
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, expect, jest, test } from '@jest/globals';
import XLSX from 'xlsx';

const EXPECTED_HASH = '2e3cea465d57e923d2b3f1f05b99cd74e112092d269872339f2c102b65a038d7';

const writes = [];
const xlsxMock = {
  ...XLSX,
  utils: XLSX.utils,
  writeFile: jest.fn((wb, fileName) => writes.push({ wb, fileName })),
};
jest.unstable_mockModule('@/lib/download', () => ({
  downloadCsv: jest.fn(),
  makeFileNameWithBrand: jest.fn((p, ext, d) => `B_${p}_${d?.toISOString?.() ?? 'x'}.${ext}`),
}));
jest.unstable_mockModule('@/lib/excel', () => ({ loadXlsx: jest.fn(async () => xlsxMock) }));
jest.unstable_mockModule('@/lib/print/window-print', () => ({
  buildAutoPrintScript: () => '<script>/*auto*/</script>',
  openPrintWindow: jest.fn(html => html),
}));

const mod = await import('@/lib/cost/margin/export.js');

const NOW = new Date('2026-06-11T10:00:00');
const ROWS = [
  {
    id: 'a',
    menuCategory: '피자',
    menuName: '<불고기&>',
    costMap: { L: 3000.4, R: 2800 },
    sizes: [
      { label: 'L', sellingPrice: 10000 },
      { label: 'R', sellingPrice: 9000 },
    ],
  },
  {
    id: 'b',
    menuCategory: '피자/프리미엄',
    menuName: '슈프림',
    costMap: { L: 5000 },
    sizes: [
      { label: 'L', sellingPrice: 20000 },
      { label: 'R', sellingPrice: 15000 },
    ],
  },
  {
    id: 'c',
    menuCategory: '사이드',
    menuName: '치즈볼',
    costMap: { 단품: 1200, 세트: 2000 },
    sizes: [
      { label: '단품', sellingPrice: 4000 },
      { label: '세트', sellingPrice: 7000 },
    ],
  },
  { id: 'd', menuCategory: '사이드', menuName: '감튀', costMap: {}, sizes: [] },
  {
    id: 'e',
    menuCategory: '',
    menuName: '기타메뉴',
    costMap: { M: 1000 },
    sizes: [{ label: 'M', sellingPrice: 3000 }],
  },
  {
    id: 'f',
    menuCategory: '음료',
    menuName: '콜라',
    costMap: { L: 500 },
    sizes: [{ label: 'L', sellingPrice: 2000 }],
  },
  {
    id: 'g',
    menuCategory: '피자',
    menuName: '무원가',
    costMap: { L: 'abc' },
    sizes: [{ label: 'L', sellingPrice: 0 }],
  },
];
const P1 = { id: 'default', name: '기본', fees: [] };
const P2 = {
  id: 'baemin',
  name: '배달의민족',
  fees: [
    { id: 'f1', label: '수수료', type: 'pct', value: 7.5 },
    { id: 'f2', label: '배달비', type: 'fixed', value: 3000 },
  ],
};
const SIZES = ['L', 'R', '단품', '세트', 'M'];

// now:'bad' 케이스는 asValidDate가 new Date()(실제 현재 시각)로 폴백해 해시가 날마다
// 달라지므로, 시스템 시계를 고정해 폴백 결과까지 결정적으로 만든다.
beforeAll(() => {
  jest.useFakeTimers({ now: NOW });
});
afterAll(() => {
  jest.useRealTimers();
});

test('분리 전후 PDF·엑셀·파일명·다운로드일 출력이 바이트 단위로 동일하다', async () => {
  const parts = [];
  for (const vm of ['cost', 'margin']) {
    for (const disc of [
      null,
      { type: 'pct', value: 10 },
      { type: 'fixed', value: 1500 },
      { type: 'pct', value: 'x' },
    ]) {
      parts.push(mod.buildMarginPrintHtml(ROWS, SIZES, vm, P2, disc, { now: NOW }));
      parts.push(mod.buildMarginPrintHtml([], [], vm, null, disc, { now: 'bad' }));
      parts.push(JSON.stringify(mod.buildMarginExcelRows(ROWS, SIZES, vm, P2, disc)));
      parts.push(
        JSON.stringify(mod.buildMarginExcelRowsAllPlatforms(ROWS, SIZES, vm, [P1, P2], disc))
      );
      parts.push(mod.printMarginPdf(ROWS, SIZES, vm, P1, disc, { now: NOW }));
      for (const opts of [{ now: NOW }, { now: NOW, allPlatforms: [P1, P2] }]) {
        writes.length = 0;
        await mod.exportMarginExcel(ROWS, SIZES, vm, P2, disc, opts);
        const { wb, fileName } = writes[0];
        parts.push(fileName);
        for (const name of wb.SheetNames) {
          parts.push(
            name +
              '|' +
              JSON.stringify(wb.Sheets[name]['!cols']) +
              '|' +
              JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }))
          );
        }
      }
    }
  }
  parts.push(mod.formatMarginDownloadDate(NOW), mod.formatMarginDownloadDate('bad').length);
  const text = parts.join('\n§\n');
  const hash = createHash('sha256').update(text).digest('hex');

  expect(hash).toBe(EXPECTED_HASH);
  expect(Object.keys(mod).sort()).toEqual([
    'buildMarginExcelRows',
    'buildMarginExcelRowsAllPlatforms',
    'buildMarginPrintHtml',
    'exportMarginExcel',
    'formatMarginDownloadDate',
    'printMarginPdf',
  ]);
});
