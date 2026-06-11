/**
 * lib/download.js — 파일 다운로드 헬퍼
 *
 * 클라이언트 전용 (Blob, URL.createObjectURL 사용).
 * v2 src/common/download.js의 JSON 부분 이식 (CSV/XLSX는 페이지별로 추가).
 */

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

/** 다운로드 날짜: "20260611" */
export function downloadDateStamp(date = new Date()) {
  const safeDate = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
  return `${safeDate.getFullYear()}${padDatePart(safeDate.getMonth() + 1)}${padDatePart(safeDate.getDate())}`;
}

/** 파일명 끝에 다운로드 날짜를 추가: "파일명_20260611.ext" */
export function withDownloadDateSuffix(fileName, date = new Date()) {
  const stamp = downloadDateStamp(date);
  const raw = String(fileName || 'export').trim() || 'export';
  const slashIndex = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
  const dotIndex = raw.lastIndexOf('.');
  const hasExtension = dotIndex > slashIndex + 1 && dotIndex < raw.length - 1;
  const rawBaseName = hasExtension ? raw.slice(0, dotIndex) : raw;
  const extension = hasExtension ? raw.slice(dotIndex) : '';
  const baseName = rawBaseName
    .replace(/(?:[_\s-])\d{8}(?:_\d{6})?$/, '')
    .replace(/(?:[_\s-])\d{4}-\d{2}-\d{2}(?:[_\s-]\d{6})?$/, '');
  if (baseName.endsWith(`_${stamp}`)) return raw;
  return `${baseName}_${stamp}${extension}`;
}

/** 날짜 포함 파일명 생성: "한글업무명_20260611.ext" */
export function makeFileName(prefix, ext, date = new Date()) {
  const safePrefix = String(prefix || '내보내기').trim() || '내보내기';
  const safeExt = String(ext || 'txt')
    .trim()
    .replace(/^\./, '');
  return `${safePrefix}_${downloadDateStamp(date)}.${safeExt}`;
}

/** Blob을 다운로드 (a 태그 트릭) */
function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = withDownloadDateSuffix(fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 큰 파일/느린 환경 대비 안전 마진 10초
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** 현재 페이지 PDF/인쇄 기본 파일명에 다운로드 날짜를 붙인다. */
export function printCurrentPageWithDownloadDate(title, options = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const previousTitle = document.title;
  const nextTitle = withDownloadDateSuffix(title || previousTitle || '출력');
  const cleanupDelayMs = Number.isFinite(Number(options.cleanupDelayMs))
    ? Math.max(0, Number(options.cleanupDelayMs))
    : 5000;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.title = previousTitle;
  };

  document.title = nextTitle;
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, cleanupDelayMs);
}

/** JSON 객체 → 파일 다운로드 (UTF-8, 압축) */
export function downloadJson(data, fileName) {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, fileName || makeFileName('JSON내보내기', 'json'));
}

/**
 * 사용자가 선택한 파일 → 텍스트 읽기 (Promise)
 *
 * @param {File} file - FileReader에 넘길 File 객체
 * @param {string[]} [allowedExt] - 허용할 확장자 배열 (소문자, 점 포함; 예: ['.json']).
 *   지정 시 file.name이 해당 확장자로 끝나지 않으면 Korean 오류를 throw한다.
 *   생략하면 확장자 검사를 수행하지 않아 기존 동작을 유지한다 (하위 호환).
 */
export function readFileAsText(file, allowedExt) {
  if (!(file instanceof File)) {
    return Promise.reject(new TypeError('readFileAsText: File 객체가 아닙니다'));
  }
  if (Array.isArray(allowedExt) && allowedExt.length > 0) {
    const name = (file.name || '').toLowerCase();
    const ok = allowedExt.some(ext => name.endsWith(ext.toLowerCase()));
    if (!ok) {
      return Promise.reject(
        new Error(`허용되지 않는 파일 형식입니다. 허용: ${allowedExt.join(', ')}`)
      );
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * 사용자가 선택한 파일 → ArrayBuffer 읽기 (Promise) — 엑셀용
 *
 * @param {File} file - FileReader에 넘길 File 객체
 * @param {string[]} [allowedExt] - 허용할 확장자 배열 (소문자, 점 포함; 예: ['.xlsx', '.xls']).
 *   지정 시 file.name이 해당 확장자로 끝나지 않으면 Korean 오류를 throw한다.
 *   생략하면 확장자 검사를 수행하지 않아 기존 동작을 유지한다 (하위 호환).
 */
export function readFileAsArrayBuffer(file, allowedExt) {
  if (!(file instanceof File)) {
    return Promise.reject(new TypeError('readFileAsArrayBuffer: File 객체가 아닙니다'));
  }
  if (Array.isArray(allowedExt) && allowedExt.length > 0) {
    const name = (file.name || '').toLowerCase();
    const ok = allowedExt.some(ext => name.endsWith(ext.toLowerCase()));
    if (!ok) {
      return Promise.reject(
        new Error(`허용되지 않는 파일 형식입니다. 허용: ${allowedExt.join(', ')}`)
      );
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 2D 배열 → CSV 문자열 (RFC4180, BOM 포함 한글 엑셀 호환)
 * @param {Array<Array<string|number>>} rows  [헤더행, ...데이터행]
 */
export function rowsToCsv(rows) {
  const esc = v => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
}

/** 2D 배열 → CSV 파일 다운로드 */
export function downloadCsv(rows, fileName) {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, fileName || makeFileName('CSV내보내기', 'csv'));
}
