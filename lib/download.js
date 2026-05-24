/**
 * lib/download.js — 파일 다운로드 헬퍼
 *
 * 클라이언트 전용 (Blob, URL.createObjectURL 사용).
 * v2 src/common/download.js의 JSON 부분 이식 (CSV/XLSX는 페이지별로 추가).
 */

/** 시간 포함 파일명 생성: "prefix_20260524_143022.ext" */
export function makeFileName(prefix, ext) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}_${dateStr}.${ext}`;
}

/** Blob을 다운로드 (a 태그 트릭) */
function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 큰 파일/느린 환경 대비 안전 마진 10초
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** JSON 객체 → 파일 다운로드 (UTF-8, indent 2) */
export function downloadJson(data, fileName) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, fileName || makeFileName('export', 'json'));
}

/** 사용자가 선택한 파일 → 텍스트 읽기 (Promise) */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}
