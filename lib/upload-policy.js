/**
 * lib/upload-policy.js — 파일 업로드 공통 정책
 *
 * 파일 크기 제한·허용 확장자·에러 메시지·중복 정책을 한 곳에서 관리한다.
 * 각 업로드 모듈은 이 상수를 import해 하드코딩을 피한다.
 *
 * ── 중복 업로드 판정 정책 ───────────────────────────────────────────────
 *
 * A. 날짜 기준 (date-based): 같은 업무 기간(연·월·날짜)의 파일은 2회 업로드 차단.
 *    적용: 판매량(연·월), 제때 가격(updateDate).
 *    에러 코드: 'DUPLICATE_MONTH' / 'DUPLICATE_DATE'
 *
 * B. 해시 기준 (hash-based, 보조): 파일 내용이 동일하면(SHA-256, HTTPS) 날짜 무관 차단.
 *    computeFileHash()를 사용. 날짜 기준보다 후순위로 적용되는 보조 안전망.
 *    적용: 제때 가격.
 *    에러 코드: 'DUPLICATE_HASH'
 *    비고: non-HTTPS 환경(로컬 dev)에서 crypto.subtle 미지원 시 FNV-1a 폴백 사용.
 *
 * C. 덮어쓰기 (overwrite): 같은 파일을 여러 번 올려도 최신 값으로 갱신.
 *    적용: 식자재 임포트, 메뉴 판매가, 영양성분 임포트.
 *
 * ───────────────────────────────────────────────────────────────────────
 */

/** 업무별 최대 업로드 파일 크기 (MB 단위) */
export const UPLOAD_MAX_MB = {
  /** 엑셀/CSV 데이터 파일 (판매량, 메뉴 판매가, 영양성분 등) */
  excel: 20,
  /** 제때 플랫폼 파일 (출고량, 단가) — 대용량 허용 */
  jette: 30,
  /** 시스템/브랜드 전체 백업 JSON */
  backup: 500,
  /** 이미지 파일 (노트/샘플 사진 1장 기준) */
  photo: 5,
};

/** 업무별 허용 파일 확장자 */
export const UPLOAD_EXT = {
  /** Excel 전용 */
  excel: ['.xlsx', '.xls'],
  /** CSV 전용 */
  csv: ['.csv'],
  /** Excel 또는 CSV */
  excelOrCsv: ['.xlsx', '.xls', '.csv'],
  /** JSON 백업 */
  json: ['.json'],
};

/**
 * 파일 크기 초과 여부 확인. 초과 시 사용자 메시지를 반환한다.
 * @param {File} file
 * @param {number} maxMb - UPLOAD_MAX_MB 값
 * @returns {string|null} 초과 시 오류 메시지, 정상이면 null
 */
export function checkFileSize(file, maxMb) {
  if (file.size === 0) return '파일이 비어 있습니다';
  if (file.size > maxMb * 1024 * 1024) return `파일이 너무 큽니다 (최대 ${maxMb}MB)`;
  return null;
}

/**
 * 파일 확장자 허용 여부 확인. 허용되지 않으면 사용자 메시지를 반환한다.
 * @param {File} file
 * @param {string[]} allowedExts - UPLOAD_EXT 값
 * @returns {string|null} 미허용 시 오류 메시지, 정상이면 null
 */
export function checkFileExt(file, allowedExts) {
  const name = (file.name || '').toLowerCase();
  const ok = allowedExts.some(ext => name.endsWith(ext.toLowerCase()));
  if (!ok) return `지원하지 않는 파일 형식입니다 (${allowedExts.join(' / ')} 만 허용)`;
  return null;
}

/**
 * 파일 파싱·읽기 실패 시 사용자 메시지를 반환한다.
 * catch 블록의 에러 객체 또는 문자열을 받아 통일된 형식으로 변환한다.
 * @param {Error|string|unknown} err
 * @returns {string}
 */
export function parseErrorMsg(err) {
  const detail = (err instanceof Error ? err.message : String(err || '')).trim().slice(0, 100);
  return detail ? `파일을 읽을 수 없습니다: ${detail}` : '파일을 읽을 수 없습니다';
}
