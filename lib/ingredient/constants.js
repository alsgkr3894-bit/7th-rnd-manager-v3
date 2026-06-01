/** 식자재 분류(scope) 값 상수 */
export const SCOPE = {
  EXCLUSIVE:       '전용',
  GENERIC:         '범용',
  GENERIC_MANAGED: '범용관리',
};

/** 코드 없는 항목이 전용/범용 미지정 상태일 때 표시값 (유효 scope enum에는 미포함) */
export const SCOPE_UNASSIGNED = '미지정';

/** 분류 탭 순서 */
export const SCOPE_ORDER = [SCOPE.EXCLUSIVE, SCOPE.GENERIC, SCOPE.GENERIC_MANAGED];

/** 카테고리 필터 특수 sentinel 값 (드롭다운/칩 전용) */
export const DISCONTINUED_FILTER  = '__discontinued__';
export const UNCATEGORIZED_FILTER = '__none__';

/** 분류별 색상 (칩·뱃지·텍스트용) */
export const SCOPE_STYLES = {
  [SCOPE.EXCLUSIVE]:       { color: 'var(--accent)',   bg: 'var(--accent-soft)' },
  [SCOPE.GENERIC]:         { color: 'var(--text-3)',   bg: undefined },
  [SCOPE.GENERIC_MANAGED]: { color: 'var(--positive)', bg: 'var(--positive-soft)' },
  [SCOPE_UNASSIGNED]:      { color: 'var(--warn)',     bg: 'var(--warn-soft)' },
};
