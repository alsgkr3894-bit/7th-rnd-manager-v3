/**
 * lib/excel-core.js — Excel / CSV 해석 (화면과 별도 스레드가 함께 쓴다)
 *
 * 화면에서는 lib/excel.js를 import한다. 이 파일은 lib/excel.js를 import하지 않는다.
 */
import {
  SPREADSHEET_LIMITS,
  assertCellCount,
  assertCellLength,
  assertColumnCount,
  assertRowCount,
  readWorkbookSafely,
} from './spreadsheet/safe-workbook';

let _xlsxPromise = null;
const CSV_DELIMITERS = [',', '\t', ';'];

function stripBom(text) {
  return typeof text === 'string' && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function bytesOf(buffer) {
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return new Uint8Array(buffer || []);
}

export function decodeCsvText(buffer) {
  const bytes = bytesOf(buffer);
  try {
    return stripBom(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    try {
      return stripBom(new TextDecoder('euc-kr').decode(bytes));
    } catch {
      return stripBom(new TextDecoder('utf-8').decode(bytes));
    }
  }
}

function detectCsvDelimiter(text) {
  const counts = new Map(CSV_DELIMITERS.map(delimiter => [delimiter, 0]));
  let inQuote = false;
  let logicalRows = 0;
  let hasCellText = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (!inQuote && CSV_DELIMITERS.includes(ch)) {
      counts.set(ch, counts.get(ch) + 1);
      hasCellText = true;
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (hasCellText) logicalRows++;
      hasCellText = false;
      if (logicalRows >= 5) break;
    } else if (!/\s/.test(ch)) {
      hasCellText = true;
    }
  }

  let best = ',';
  let bestCount = 0;
  for (const delimiter of CSV_DELIMITERS) {
    const count = counts.get(delimiter) || 0;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/** xlsx 모듈을 한 번만 로드해서 캐싱 (lazy load). */
export async function loadXlsx() {
  if (!_xlsxPromise) {
    _xlsxPromise = import('xlsx');
  }
  return _xlsxPromise;
}

/**
 * Excel 파일(ArrayBuffer) → { headers, rows, sheetName, rawRows }
 *
 * @param {ArrayBuffer} arrayBuffer - File.arrayBuffer() 결과
 * @returns {Promise<{headers: string[], rows: object[], sheetName: string, rawRows: any[][]}>}
 */
export async function readExcelFile(arrayBuffer) {
  const XLSX = await loadXlsx();
  const workbook = readWorkbookSafely(XLSX, arrayBuffer, { type: 'array', cellDates: true });
  if (!workbook.SheetNames.length) throw new Error('시트가 없습니다');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerRowIndex = detectHeaderRow(raw);
  const headerRow = raw[headerRowIndex] || [];
  const headers = headerRow.map(h => String(h).trim());

  const rows = raw
    .slice(headerRowIndex + 1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        if (isUnsafeHeaderKey(h)) return;
        obj[h] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    })
    .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));

  return { headers, rows, sheetName, rawRows: raw };
}

/**
 * CSV 텍스트 → { headers, rows, rawRows }
 * UTF-8 BOM, 큰따옴표 quote, quoted newline 처리. 행·열·칸 상한을 넘으면 파일 전체를 거부한다.
 *
 * @param {string} text - File 텍스트 (FileReader.readAsText 결과)
 */
export function readCsvFile(text) {
  const bom = stripBom(String(text ?? ''));
  const delimiter = detectCsvDelimiter(bom);
  const rawRows = [];
  let row = [];
  let cur = '';
  let inQuote = false;
  let cells = 0;

  const pushField = () => {
    assertCellLength(cur);
    row.push(cur.trim());
    assertColumnCount(row.length);
    cur = '';
  };
  const pushRow = () => {
    pushField();
    if (row.some(cell => String(cell).trim().length > 0)) {
      rawRows.push(row);
      cells += row.length;
      // 첫 행은 머리글이라 데이터 행 상한에 넣지 않는다
      assertRowCount(rawRows.length - 1);
      assertCellCount(cells);
    }
    row = [];
  };

  for (let i = 0; i < bom.length; i++) {
    const ch = bom[i];
    if (ch === '"') {
      if (inQuote && bom[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === delimiter && !inQuote) {
      pushField();
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && bom[i + 1] === '\n') i++;
      pushRow();
    } else {
      cur += ch;
      // 따옴표가 닫히지 않은 파일은 한 칸이 끝없이 길어진다
      if (cur.length > SPREADSHEET_LIMITS.cellChars) assertCellLength(cur);
    }
  }

  if (cur !== '' || row.length > 0) {
    pushRow();
  }

  if (rawRows.length === 0) return { headers: [], rows: [], rawRows: [] };

  const headers = rawRows[0];
  const rows = rawRows
    .slice(1)
    .map(values => {
      const obj = {};
      headers.forEach((h, i) => {
        if (isUnsafeHeaderKey(h)) return;
        obj[h] = values[i] ?? '';
      });
      return obj;
    })
    .filter(row => Object.values(row).some(v => v !== ''));

  return { headers, rows, rawRows };
}

/**
 * 헤더 행 추정: 최대 20행 안에서 비어있지 않은 셀이 3개 이상인 첫 행.
 */
export function detectHeaderRow(rows, max = 20) {
  if (!Array.isArray(rows)) return 0;
  const limit = Math.min(rows.length, max);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const nonEmpty = row.filter(c => c !== '' && c !== null && c !== undefined);
    if (nonEmpty.length >= 3) return i;
  }
  return 0;
}

/** 객체 키로 쓰면 안 되는 헤더(프로토타입 오염 방지) */
export function isUnsafeHeaderKey(header) {
  return header === '__proto__' || header === 'constructor' || header === 'prototype';
}

/**
 * 파일 이름의 확장자(.csv/.xlsx/.xls)에 맞춰 해석한다.
 * @param {ArrayBuffer} buffer
 * @param {string} fileName
 * @returns {Promise<{headers: string[], rows: object[]}>}
 */
export async function parseSpreadsheetBuffer(buffer, fileName) {
  const name = String(fileName || '').toLowerCase();
  const dotIndex = name.lastIndexOf('.');
  const ext = dotIndex >= 0 ? name.slice(dotIndex) : '';
  if (ext === '.csv' || ext === '.tsv') return readCsvFile(decodeCsvText(buffer));
  if (ext === '.xlsx' || ext === '.xls') return readExcelFile(buffer);
  throw new Error('지원하지 않는 파일 형식입니다. (.csv, .tsv, .xlsx, .xls만 허용)');
}
