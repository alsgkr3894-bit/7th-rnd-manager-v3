import {
  PRODUCT_TYPE_GENERIC,
  PRODUCT_TYPE_LABEL,
  PRODUCT_TYPE_OPTIONS,
  PRODUCT_TYPE_SHORT_LABEL,
} from '@/lib/jette/product-types';

export {
  canManageProductType,
  getProductTypeLabel,
  normalizeManagedFlag,
  normalizeManagedProductDraft,
  normalizeManagedProductRecord,
  normalizeProductType,
  PRODUCT_TYPE_EXCLUSIVE,
  PRODUCT_TYPE_GENERIC,
} from '@/lib/jette/product-types';

/**
 * 제때상품관리 모듈 공통 상수
 */

export const TYPE_OPTIONS = PRODUCT_TYPE_OPTIONS;

export const TYPE_LABEL = PRODUCT_TYPE_SHORT_LABEL;

export const PRODUCT_TYPE_STYLE = {
  exclusive: {
    label: PRODUCT_TYPE_LABEL.exclusive,
    bg: 'var(--accent-soft)',
    color: 'var(--accent-text)',
  },
  [PRODUCT_TYPE_GENERIC]: {
    label: PRODUCT_TYPE_LABEL[PRODUCT_TYPE_GENERIC],
    bg: 'var(--scope-generic-soft)',
    color: 'var(--scope-generic)',
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
