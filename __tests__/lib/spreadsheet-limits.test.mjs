/**
 * 점검 4단계: 엑셀·CSV의 상한을 넘으면 일부만 읽지 않고 거부한다. 정상 파일의 결과는 같다.
 */
import { describe, expect, test } from '@jest/globals';
import * as XLSX from 'xlsx';
import {
  SPREADSHEET_LIMITS,
  assertSafeArchive,
  readWorkbookSafely,
} from '../../lib/spreadsheet/safe-workbook.js';
import { parseSpreadsheetBuffer, readCsvFile } from '../../lib/excel-core.js';

const limits = changes => ({ ...SPREADSHEET_LIMITS, ...changes });

function workbookBytes(rows, { name = 'Sheet1', compression = true, ref } = {}) {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  if (ref) sheet['!ref'] = ref;
  XLSX.utils.book_append_sheet(book, sheet, name);
  return XLSX.write(book, { type: 'array', bookType: 'xlsx', compression });
}

const table = count => [
  ['품목코드', '품목명', '단가'],
  ...Array.from({ length: count }, (_, i) => [`C${i}`, `치즈 ${i}`, i]),
];

const read = (bytes, changes) =>
  readWorkbookSafely(XLSX, bytes, { type: 'array' }, limits(changes));

describe('xlsx', () => {
  test('정상 파일은 상한이 없을 때와 같은 결과다', async () => {
    const bytes = workbookBytes(table(20));
    const plain = XLSX.read(bytes, { type: 'array' });
    const safe = read(bytes);
    const toRows = book => XLSX.utils.sheet_to_json(book.Sheets.Sheet1, { header: 1, defval: '' });
    expect(toRows(safe)).toEqual(toRows(plain));
    await expect(parseSpreadsheetBuffer(bytes, 'a.xlsx')).resolves.toMatchObject({
      headers: ['품목코드', '품목명', '단가'],
    });
  });

  test('행 상한까지는 읽고, 한 행이라도 넘으면 거부한다', () => {
    // 머리글 포함 11행
    expect(() => read(workbookBytes(table(10)), { rows: 11 })).not.toThrow();
    expect(() => read(workbookBytes(table(11)), { rows: 11 })).toThrow('행이 11개를 넘습니다');
    expect(() => read(workbookBytes(table(500)), { rows: 11 })).toThrow('행이 11개를 넘습니다');
  });

  test.each([
    ['열', { columns: 2 }, '열이 2개를 넘습니다'],
    ['칸', { cells: 8 }, '칸이 8개를 넘습니다'],
    ['칸 글자', { cellChars: 3 }, '글자가 3자를 넘습니다'],
    ['압축 해제 크기', { unzippedBytes: 100 }, '압축을 풀면'],
    ['압축 항목 수', { zipEntries: 2 }, '항목이 너무 많습니다'],
  ])('%s 상한', (_, changes, message) => {
    expect(() => read(workbookBytes(table(10)), changes)).toThrow(message);
  });

  test('시트 수 상한', () => {
    const book = XLSX.utils.book_new();
    for (const name of ['a', 'b', 'c']) {
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([[1]]), name);
    }
    const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
    expect(() => read(bytes, { sheets: 2 })).toThrow('시트가 너무 많습니다');
  });

  test('서식 때문에 범위만 부풀려진 시트는 실제 범위로 읽는다', () => {
    const bytes = workbookBytes(table(3), { ref: 'A1:Z100' });
    const book = read(bytes, { cells: 20 });
    expect(book.Sheets.Sheet1['!ref']).toBe('A1:C4');
    const rows = XLSX.utils.sheet_to_json(book.Sheets.Sheet1, { header: 1, defval: '' });
    expect(rows).toHaveLength(4);
    // 범위가 상한 안이면 그대로 둔다
    expect(read(bytes).Sheets.Sheet1['!ref']).toBe('A1:Z100');
  });

  test('엑셀이 아닌 파일은 압축 검사를 건너뛴다', () => {
    expect(() => assertSafeArchive(new TextEncoder().encode('a,b\n1,2\n'))).not.toThrow();
  });
});

describe('CSV', () => {
  const csv = count => ['a,b', ...Array.from({ length: count }, (_, i) => `${i},x`)].join('\n');

  test('상한 안의 파일은 그대로 읽는다', () => {
    expect(readCsvFile(csv(3)).rows).toHaveLength(3);
  });

  test('행·열·칸 글자 상한을 넘으면 거부한다', () => {
    expect(() => readCsvFile(csv(SPREADSHEET_LIMITS.rows + 1))).toThrow(
      '행이 300,000개를 넘습니다'
    );
    expect(() => readCsvFile(`a${',x'.repeat(SPREADSHEET_LIMITS.columns)}`)).toThrow('열이');
    expect(() => readCsvFile(`a,"${'x'.repeat(SPREADSHEET_LIMITS.cellChars + 1)}`)).toThrow(
      '글자가'
    );
  });
});
