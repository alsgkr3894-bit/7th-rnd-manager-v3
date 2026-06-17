/**
 * lib/auth/guard.js — 파괴적 액션의 실행함수 레이어 권한 가드 (defense-in-depth)
 *
 * UI disabled에만 의존하지 않고, 파괴적 실행 함수 내부에서도 viewer를 차단한다.
 * canonical 역할 소스인 getActiveRole()을 재사용한다.
 * - 계정 0개(신규 설치) → 'admin' 기본값 → 모든 가드 통과 (의도된 동작)
 * - DB 오류 → 'viewer' (fail-closed)
 */
import { getActiveRole } from '@/lib/auth/accounts';

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
  const role = await getActiveRole();
  if (role !== 'admin') {
    throw new PermissionDeniedError(actionLabel);
  }
}
