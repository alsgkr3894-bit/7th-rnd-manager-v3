/**
 * app/settings/backup/panels/serverBackupView.js — 서버 DB·백업 목록 상태의 표시 값 (순수)
 *
 * DB 상태와 백업 목록은 따로 조회한다. 한쪽 조회 실패를 "백업 0개"나 "DB 오류"로 보여 주지 않는다.
 * *Check = { error: string, at: ISO 문자열|null(마지막 성공 시각) }
 */
import { formatNumber, formatRelative } from '@/lib/format';
import { formatBackupStatus, formatBytes } from './backupPanelShared';

const lastSeen = at => (at ? `마지막 확인 ${formatRelative(at)}` : '');

export function dbTile({ dbStatus, dbCheck, loading }) {
  const rows = `동기화 데이터 ${formatNumber(dbStatus?.counts?.storeRows || 0)}행`;
  if (dbCheck?.error) {
    return {
      value: '확인 실패',
      sub: dbStatus ? `${lastSeen(dbCheck.at)} 기준 ${rows}` : 'DB 상태를 읽지 못했습니다',
    };
  }
  if (!dbStatus) return { value: loading ? '확인 중' : '확인 전', sub: '서버 DB 읽기 API 대기' };
  return dbStatus.ok
    ? { value: '연결됨', sub: rows }
    : { value: '오류', sub: '서버 DB 읽기 API 대기' };
}

export function latestBackupTile({ backupStatus, backupCheck, loading }) {
  if (!backupStatus) {
    return backupCheck?.error
      ? { value: '확인 실패', sub: '백업 목록 확인 실패' }
      : { value: loading ? '확인 중' : '확인 전', sub: '백업 목록 대기' };
  }
  const latest = backupStatus.latest;
  const detail = latest
    ? `${formatRelative(latest.modifiedAt)} · ${formatBytes(latest.size)}`
    : '아직 서버 백업 파일이 없습니다';
  return {
    value: formatBackupStatus(backupStatus),
    sub: backupCheck?.error ? `목록 확인 실패 · ${lastSeen(backupCheck.at)} 기준` : detail,
  };
}

/** 개수는 목록 조회가 성공했을 때만 보여 준다 — 못 읽은 것을 0개로 표시하지 않는다 */
export function backupCountTile({ backupStatus, backupCheck }) {
  if (!backupStatus) {
    return {
      value: '확인 불가',
      sub: backupCheck?.error ? '백업 목록 확인 실패' : '백업 목록 대기',
    };
  }
  return {
    value: `${formatNumber(backupStatus.count || 0)}개`,
    sub: `${formatBytes(backupStatus.totalSize || 0)} · 서버 내부 안전 보관`,
  };
}

/** 임시 DB에 실제로 복원해 확인한 마지막 시각 (npm run db:restore:verify) */
export function restoreVerifyTile({ backupStatus, backupCheck }) {
  if (!backupStatus) {
    return {
      value: '확인 불가',
      sub: backupCheck?.error ? '백업 목록 확인 실패' : '백업 목록 대기',
    };
  }
  const last = backupStatus.lastVerified;
  return last
    ? { value: formatRelative(last.verifiedAt), sub: `${last.name} 복원 성공` }
    : { value: '기록 없음', sub: '운영 PC에서 npm run db:restore:verify 실행' };
}

const COPY_PROBLEMS = {
  unavailable: ['연결 안 됨', '사본 폴더를 찾지 못했습니다. USB 드라이브를 확인해 주세요'],
  'same-folder': ['설정 오류', '사본 폴더가 원본 백업 폴더와 같습니다'],
  'no-backup': ['확인 필요', '가장 최근 백업의 사본이 아직 없습니다'],
  failed: ['복사 실패', '복사하지 못했습니다. 드라이브의 남은 공간과 상태를 확인해 주세요'],
};

/** 다른 드라이브(USB)에 만든 사본 (DB_BACKUP_COPY_DIR) */
export function copyTile({ backupStatus, backupCheck }) {
  if (!backupStatus) {
    return {
      value: '확인 불가',
      sub: backupCheck?.error ? '백업 목록 확인 실패' : '백업 목록 대기',
    };
  }
  const copy = backupStatus.copy;
  if (!copy) return { value: '기록 없음', sub: '다른 드라이브 사본이 설정되지 않았거나 아직 없음' };
  if (copy.ok) {
    return { value: formatRelative(copy.checkedAt), sub: `${copy.latestName} 복사 확인` };
  }
  const [value, sub] = COPY_PROBLEMS[copy.reason] || COPY_PROBLEMS.failed;
  const last = copy.lastSuccessAt ? ` · 마지막 성공 ${formatRelative(copy.lastSuccessAt)}` : '';
  return { value, sub: `${sub}${last}` };
}

export function verificationLabel(verification) {
  if (!verification) return '-';
  return verification.ok ? '성공' : '실패';
}

export function backupListMessage({ backupStatus, backupCheck, loading }) {
  if (!backupStatus) {
    if (backupCheck?.error) return '백업 목록 확인 실패';
    return loading ? '서버 백업 목록 확인 중...' : '서버 백업 목록을 아직 확인하지 않았습니다';
  }
  return backupStatus.backups?.length ? '' : '서버 백업 목록이 비어 있습니다.';
}

export function importJobsMessage({ dbStatus, dbCheck, loading }) {
  if (!dbStatus) {
    if (dbCheck?.error) return 'PostgreSQL 작업 이력 확인 실패';
    return loading ? 'PostgreSQL 작업 이력 확인 중...' : '작업 이력을 아직 확인하지 않았습니다';
  }
  return dbStatus.recentImportJobs?.length ? '' : '최근 import 작업이 없습니다.';
}

export function serverStatusErrors({ dbCheck, backupCheck, createError }) {
  return [
    dbCheck?.error && { label: 'DB 상태 확인 실패', message: dbCheck.error },
    backupCheck?.error && { label: '백업 목록 확인 실패', message: backupCheck.error },
    createError && { label: '백업 생성 실패', message: createError },
  ].filter(Boolean);
}
