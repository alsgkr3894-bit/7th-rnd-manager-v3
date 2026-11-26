/**
 * lib/backup/file-check.js — 저장한 백업 파일 읽기 확인 (순수)
 *
 * 브라우저는 다운로드가 실제로 저장됐는지 알 수 없다. 사용자가 저장한 파일을 다시 선택하면
 * 읽을 수 있는지, 이 브라우저에서 내보낸 그 백업인지를 확인한다. (DB 복원 검증은 아니다)
 */
import { summarizeBackupStores, validateBackupPayload } from '@/lib/backup/validation';

/** 이력에 남겨 두는 식별 값 — 나중에 선택한 파일과 대조한다 */
export function backupFileStamp(data) {
  return {
    exportedAt: typeof data?.exportedAt === 'string' ? data.exportedAt : '',
    fileRows: summarizeBackupStores(data?.stores).totalRows,
  };
}

/**
 * @param {unknown} data 파일을 JSON으로 읽은 값
 * @param {Array<object>} history 백업 이력
 * @returns {{ ok: true, entry: object, rows: number } | { ok: false, reason: string }}
 * @throws {Error} 백업 파일 형식이 아닐 때
 */
export function checkBackupFile(data, history) {
  const { summary } = validateBackupPayload(data);
  if (summary.failedStoreCount > 0) {
    return {
      ok: false,
      reason: `백업을 만들 때 ${summary.failedStoreCount}개 저장소가 빠진 파일이에요. 다시 백업해 주세요.`,
    };
  }
  const entry = (Array.isArray(history) ? history : []).find(
    item => item?.exportedAt && item.exportedAt === summary.exportedAt
  );
  if (!entry) {
    return {
      ok: false,
      reason: '이 브라우저의 백업 이력에 없는 파일이에요. 방금 다운로드한 파일을 선택해 주세요.',
    };
  }
  if (Number.isFinite(entry.fileRows) && entry.fileRows !== summary.totalRows) {
    return {
      ok: false,
      reason: `내보낸 내용과 행 수가 달라요 (내보냄 ${entry.fileRows} · 파일 ${summary.totalRows}).`,
    };
  }
  return { ok: true, entry, rows: summary.totalRows };
}
