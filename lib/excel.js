/**
 * lib/excel.js — Excel / CSV 파일 읽기 + 헤더 매칭
 *
 * v2 src/common/excel.js 이식. v2와 동작 동일.
 *
 * 변경점:
 *   - v2는 xlsx-loader로 동적 script 로드 (xlsx.full.min.js)
 *   - v3는 npm의 xlsx 패키지를 dynamic import (Next.js 표준)
 *     → 초기 번들 크기 줄임 + 첫 호출 시점에만 로드
 *   - 올린 파일의 해석은 별도 스레드에서 한다(큰 파일에도 화면이 멈추지 않게). 해석 코드는
 *     lib/excel-core.js, 상한은 lib/spreadsheet/safe-workbook.js.
 *
 * 사용:
 *   import { readSpreadsheetFile } from '@/lib/excel';
 *   // 'use client' 컴포넌트 안에서만 호출
 */
import { loadXlsx, parseSpreadsheetBuffer } from './excel-core';
import { SPREADSHEET_LIMITS } from './spreadsheet/safe-workbook';
import { runInWorker } from './worker/run-in-worker';

export {
  decodeCsvText,
  detectHeaderRow,
  isUnsafeHeaderKey,
  loadXlsx,
  readCsvFile,
  readExcelFile,
} from './excel-core';
export { readWorkbookSafely } from './spreadsheet/safe-workbook';

let _xlsxStyledPromise = null;

/**
 * 셀 스타일(테두리·굵게·정렬)을 실제로 파일에 쓰는 writer. `xlsx`(커뮤니티판)는 셀의 `s`를
 * 조용히 버리므로, 테두리가 있어야 하는 출력물(원산지 표시판 등)만 이걸로 쓴다.
 * API는 `xlsx` 0.18.5와 동일(xlsx-js-style = 같은 버전의 스타일 지원 포크).
 */
export async function loadXlsxStyled() {
  if (!_xlsxStyledPromise) {
    // CJS 전용 패키지라 런타임에 따라 네임스페이스에 default만 있을 수 있다.
    _xlsxStyledPromise = import('xlsx-js-style').then(mod => (mod?.utils ? mod : mod.default));
  }
  return _xlsxStyledPromise;
}

/** 헤더 비교용 정규화 — 모든 공백과 끝의 (…)·[…] 단위 설명을 뗀다: "단 가", "단가(원)" → "단가" */
export function normalizeHeaderKey(value) {
  return String(value ?? '')
    .replace(/[(\[（][^)\]）]*[)\]）]\s*$/, '')
    .replace(/\s+/g, '');
}

/**
 * headers 안에서 candidates 중 첫 번째 매칭되는 헤더 반환.
 * 먼저 정확히 같은 헤더(앞뒤 공백만 무시)를 찾고, 없으면 공백·괄호 설명을 뗀 형태로 다시 찾는다.
 */
export function matchColumn(headers, candidates) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  for (const candidate of safeCandidates) {
    const found = safeHeaders.find(h => String(h).trim() === candidate);
    if (found !== undefined) return found;
  }
  for (const candidate of safeCandidates) {
    const key = normalizeHeaderKey(candidate);
    if (!key) continue;
    const found = safeHeaders.find(h => normalizeHeaderKey(h) === key);
    if (found !== undefined) return found;
  }
  return null;
}

/** 인덱스 기반 fallback */
export function fallbackByIndex(row, index) {
  if (!Array.isArray(row)) return undefined;
  return row[index];
}

/**
 * 확장자(.csv/.xlsx/.xls)를 자동 감지하여 파일을 읽는다.
 * use-shipment, use-price-upload 공용.
 *
 * @param {File} file
 * @returns {Promise<{headers: string[], rows: object[]}>}
 */
export async function readSpreadsheetFile(file) {
  return readSpreadsheetFromBuffer(await file.arrayBuffer(), file?.name);
}

/**
 * 이미 읽어둔 ArrayBuffer로부터 파싱한다(파일을 두 번 읽지 않도록 buffer 공유용).
 * 파싱과 해시가 같은 버퍼를 쓰게 해 디스크 read를 1회로 줄인다. 버퍼는 넘기지 않고 복사한다.
 *
 * @param {ArrayBuffer} buffer
 * @param {string} fileName
 * @returns {Promise<{headers: string[], rows: object[]}>}
 */
export async function readSpreadsheetFromBuffer(buffer, fileName) {
  return runInWorker({
    createWorker: () =>
      new Worker(new URL('./spreadsheet/parse.worker.js', import.meta.url), { type: 'module' }),
    message: { buffer, fileName },
    timeoutMs: SPREADSHEET_LIMITS.timeoutMs,
    fallback: () => parseSpreadsheetBuffer(buffer, fileName),
  });
}

/**
 * 파일의 SHA-256 해시 문자열 반환 (중복 업로드 차단용).
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function computeFileHash(file) {
  return computeBufferHash(await file.arrayBuffer());
}

/**
 * 이미 읽어둔 ArrayBuffer로부터 해시를 계산한다(파일 재읽기 없이 buffer 재사용).
 *
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>}
 */
export async function computeBufferHash(buffer) {
  // crypto.subtle은 보안 컨텍스트(HTTPS·localhost)에서만 제공된다.
  // 비보안 컨텍스트(예: http://192.168.x.x 사내 접속)에서는 undefined이므로 폴백한다.
  if (globalThis.crypto?.subtle?.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return fallbackHash(new Uint8Array(buffer));
}

/**
 * crypto.subtle 미지원 환경용 비암호화 해시 (중복 업로드 차단 전용).
 * FNV-1a 32bit 누산기 2개 + 바이트 길이를 조합해 충돌 확률을 낮춘다.
 */
function fallbackHash(bytes) {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    h1 = Math.imul(h1 ^ b, 0x01000193);
    h2 = Math.imul(h2 ^ (b + (i & 0xff)), 0x01000193);
  }
  const hex = n => (n >>> 0).toString(16).padStart(8, '0');
  return `f${hex(h1)}${hex(h2)}${bytes.length.toString(16)}`;
}
