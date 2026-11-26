/**
 * lib/db/errors.js — 브라우저 저장소 오류를 원인별로 나눠 알린다.
 *
 * "업그레이드 차단", "저장 공간 부족", "앱보다 새 데이터", "저장소 손상"은 사용자가 할 일이
 * 서로 다르다. 어느 경우에도 데이터를 지우라고 안내하지 않는다.
 */
export const DB_ERROR_EVENT = 'db:error';

export const DB_ERROR_MESSAGES = {
  blocked:
    '다른 탭이 열려 있어 데이터베이스 업데이트가 보류되었습니다. 다른 탭을 닫으면 이어서 진행됩니다.',
  quota:
    '브라우저 저장 공간이 부족해 저장하지 못했습니다. 디스크 공간을 확보한 뒤 다시 저장해 주세요.',
  newer:
    '이 브라우저의 데이터는 더 새 버전의 앱에서 저장한 것입니다. 앱을 최신 버전으로 실행해 주세요. 데이터는 그대로 있습니다.',
  storage:
    '브라우저 저장소를 읽거나 쓰지 못했습니다. 새로고침해도 계속되면 브라우저 데이터를 지우지 말고 복구 안내(docs/RECOVERY.md)를 확인해 주세요.',
};

const KIND_BY_NAME = {
  DbBlockedError: 'blocked',
  QuotaExceededError: 'quota',
  VersionError: 'newer',
  UnknownError: 'storage',
  NotReadableError: 'storage',
};

/** @returns {'blocked'|'quota'|'newer'|'storage'|null} 알릴 필요가 없는 오류는 null */
export function classifyDbError(error) {
  return KIND_BY_NAME[error?.name] || null;
}

export function reportDbError(error) {
  const kind = classifyDbError(error);
  if (!kind || typeof window === 'undefined') return kind;
  window.dispatchEvent(new CustomEvent(DB_ERROR_EVENT, { detail: { kind } }));
  return kind;
}
