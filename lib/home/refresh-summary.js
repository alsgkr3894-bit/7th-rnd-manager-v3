/**
 * lib/home/refresh-summary.js — 홈 새로고침 결과 판정 (순수)
 */

/**
 * Promise.allSettled 결과 묶음들을 합쳐 새로고침 결과를 판정한다.
 * @returns {{ status: 'ok'|'partial'|'failed', failed: number, total: number }}
 */
export function summarizeRefresh(...groups) {
  const results = groups.flat().filter(Boolean);
  const failed = results.filter(result => result.status === 'rejected').length;
  const total = results.length;
  const status = failed === 0 ? 'ok' : failed === total ? 'failed' : 'partial';
  return { status, failed, total };
}

/** 새로고침 버튼 안내 — 'error'는 로더가 이미 오류를 알렸으므로 null */
export function refreshToast(summary) {
  if (summary?.status === 'ok') return { message: '대시보드를 새로고침했어요', type: 'ok' };
  if (summary?.status === 'partial') {
    return {
      message: `일부 정보(${summary.failed}개)를 갱신하지 못했어요. 이전 값이 보일 수 있어요.`,
      type: 'warn',
    };
  }
  if (summary?.status === 'failed') {
    return { message: '새로고침에 실패했어요. 잠시 후 다시 시도해 주세요.', type: 'error' };
  }
  return null;
}
