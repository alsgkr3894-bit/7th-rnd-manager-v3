/**
 * lib/auth/guard.js — 파괴적 액션의 실행함수 레이어 권한 가드 (defense-in-depth)
 *
 * UI disabled에만 의존하지 않고, 파괴적 실행 함수 내부에서도 viewer를 차단한다.
 * canonical 역할 소스인 getActiveRole()을 재사용한다.
 * - 계정 0개(신규 설치) → 'admin' 기본값 → 모든 가드 통과 (의도된 동작)
 * - DB 오류 → 'viewer' (fail-closed)
 *
 * getActiveRole은 호출 시점에 동적 import한다. 이유:
 *  1) accounts.js → guard.js 순환 import를 회피(accounts 함수도 이 가드를 쓴다)
 *  2) 가드를 쓰는 모듈을 import하는 테스트가 accounts.js의 무거운 의존성(@/lib/db
 *     전체 export)까지 mock하도록 강요하지 않음 — 가드를 실제 호출할 때만 로드된다.
 */

export class PermissionDeniedError extends Error {
  constructor(actionLabel) {
    super(`권한이 없습니다: ${actionLabel} 작업은 관리자만 수행할 수 있습니다.`);
    this.name = 'PermissionDeniedError';
    this.code = 'PERMISSION_DENIED';
  }
}

/**
 * 현재 활성 계정이 admin이 아니면 PermissionDeniedError를 throw한다.
 * @param {string} actionLabel 사용자 표시용 액션 이름 (예: '계정 삭제')
 * @returns {Promise<void>}
 */
export async function assertActiveAdmin(actionLabel) {
  const { getActiveRole } = await import('@/lib/auth/accounts');
  const role = await getActiveRole();
  if (role !== 'admin') {
    throw new PermissionDeniedError(actionLabel);
  }
}
