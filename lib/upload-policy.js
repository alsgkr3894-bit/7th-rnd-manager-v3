/**
 * lib/upload-policy.js — 파일 업로드 공통 정책
 *
 * 파일 크기 제한과 허용 확장자를 한 곳에서 관리한다.
 * 각 업로드 모듈은 이 상수를 import해 하드코딩을 피한다.
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
