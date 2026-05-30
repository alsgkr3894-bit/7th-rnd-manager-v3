/** 식자재 분류(scope) 값 상수 */
export const SCOPE = {
  EXCLUSIVE:       '전용',
  GENERIC:         '범용',
  GENERIC_MANAGED: '범용관리',
};

/** 분류 탭 순서 */
export const SCOPE_ORDER = [SCOPE.EXCLUSIVE, SCOPE.GENERIC, SCOPE.GENERIC_MANAGED];

/** 분류별 색상 (칩·뱃지·텍스트용) */
export const SCOPE_STYLES = {
  [SCOPE.EXCLUSIVE]:       { color: 'var(--accent)',   bg: 'var(--accent-soft)' },
  [SCOPE.GENERIC]:         { color: 'var(--text-3)',   bg: undefined },
  [SCOPE.GENERIC_MANAGED]: { color: 'var(--positive)', bg: 'var(--positive-soft)' },
};
