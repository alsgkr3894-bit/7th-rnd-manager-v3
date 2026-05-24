/**
 * lib/excel.js — Excel / CSV 파일 읽기 + 헤더 매칭
 *
 * v2 src/common/excel.js 이식. v2와 동작 동일.
 *
 * 변경점:
 *   - v2는 xlsx-loader로 동적 script 로드 (xlsx.full.min.js)
 *   - v3는 npm의 xlsx 패키지를 dynamic import (Next.js 표준)
 *     → 초기 번들 크기 줄임 + 첫 호출 시점에만 로드
 *
 * 사용:
 *   import { readExcelFile, readCsvFile } from '@/lib/excel';
 *   // 'use client' 컴포넌트 안에서만 호출
 */

let _xlsxPromise = null;

/** xlsx 모듈을 한 번만 로드해서 캐싱 (lazy load). */
async function loadXlsx() {
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
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerRowIndex = detectHeaderRow(raw);
  const headerRow = raw[headerRowIndex] || [];
  const headers = headerRow.map(h => String(h).trim());

  const rows = raw.slice(headerRowIndex + 1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    })
    .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));

  return { headers, rows, sheetName, rawRows: raw };
}

/**
 * CSV 텍스트 → { headers, rows, rawRows }
 * UTF-8 BOM, 큰따옴표 quote 처리.
 *
 * @param {string} text - File 텍스트 (FileReader.readAsText 결과)
 */
export function readCsvFile(text) {
  const bom = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const lines = bom.split(/\r?\n/);
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return { headers: [], rows: [], rawRows: [] };

  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === ',' && !inQuote) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(nonEmpty[0]);
  const rawRows = nonEmpty.map(parseLine);
  const rows = rawRows.slice(1).map(values => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== ''));

  return { headers, rows, rawRows };
}

/**
 * 헤더 행 추정: 최대 20행 안에서 비어있지 않은 셀이 3개 이상인 첫 행.
 */
export function detectHeaderRow(rows, max = 20) {
  const limit = Math.min(rows.length, max);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const nonEmpty = row.filter(c => c !== '' && c !== null && c !== undefined);
    if (nonEmpty.length >= 3) return i;
  }
  return 0;
}

/** headers 안에서 candidates 중 첫 번째 매칭되는 헤더 반환 */
export function matchColumn(headers, candidates) {
  for (const candidate of candidates) {
    const found = headers.find(h => String(h).trim() === candidate);
    if (found !== undefined) return found;
  }
  return null;
}

/** 인덱스 기반 fallback */
export function fallbackByIndex(row, index) {
  if (!Array.isArray(row)) return undefined;
  return row[index];
}
