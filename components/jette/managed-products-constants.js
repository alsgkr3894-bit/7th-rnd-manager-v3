/**
 * 제때상품관리 모듈 공통 상수
 */

export const TYPE_OPTIONS = [
  { value: 'exclusive', label: '전용상품' },
  { value: 'generic', label: '범용상품' },
  { value: 'generic-managed', label: '범용관리' },
];

export const TYPE_LABEL = {
  exclusive: '전용',
  generic: '범용',
  'generic-managed': '범용관리',
};

export const PRODUCT_TYPE_STYLE = {
  exclusive: { label: '전용상품', bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  generic: { label: '범용상품', bg: 'var(--scope-generic-soft)', color: 'var(--scope-generic)' },
  'generic-managed': {
    label: '범용관리',
    bg: 'var(--scope-generic)',
    color: 'var(--scope-generic-ink)',
  },
};

export const CHANGE_STATUS = {
  UP: '인상',
  DOWN: '인하',
  SAME: '변동없음',
  NEW: '신규',
  DELETED: '삭제',
};

/** changeStatus 값별 chip 스타일 */
export const CHANGE_STATUS_STYLE = {
  [CHANGE_STATUS.UP]: { bg: 'var(--negative-soft)', color: 'var(--negative)' },
  [CHANGE_STATUS.DOWN]: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  [CHANGE_STATUS.NEW]: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  [CHANGE_STATUS.DELETED]: { bg: 'var(--surface-2)', color: 'var(--text-3)' },
  [CHANGE_STATUS.SAME]: { bg: 'var(--surface-2)', color: 'var(--text-2)' },

  /** 상태값이 없을 때 사용하는 기본값 */
  _default: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
};

/** 폼 필드용 (패딩 보통) */
export const inputStyle = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-1)',
  fontSize: 13,
};

/** 테이블 셀 내 컴팩트 select용 */
export const typeSelectStyle = {
  padding: '3px 6px',
  borderRadius: 6,
  fontSize: 12,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-1)',
  cursor: 'pointer',
};
