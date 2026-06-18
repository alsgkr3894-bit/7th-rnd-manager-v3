'use client';

import { formatNumber, formatPercent } from '@/lib/format';
import { MENU_RECIPE_SUMMARY_STATUS } from '@/lib/menu-master/recipe-summary';

const RECIPE_STATUS_STYLE = {
  [MENU_RECIPE_SUMMARY_STATUS.READY]: {
    background: 'var(--positive-soft)',
    color: 'var(--positive)',
  },
  [MENU_RECIPE_SUMMARY_STATUS.MISSING]: {
    background: 'var(--surface-2)',
    color: 'var(--text-3)',
  },
  [MENU_RECIPE_SUMMARY_STATUS.NEEDS_PRICE]: {
    background: 'var(--warn-soft)',
    color: 'var(--warn)',
  },
  [MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY]: {
    background: 'var(--warn-soft)',
    color: 'var(--warn)',
  },
  [MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED]: {
    background: 'var(--surface-2)',
    color: 'var(--text-4)',
  },
};

const RECIPE_STATUS_LABEL = {
  [MENU_RECIPE_SUMMARY_STATUS.READY]: '완료',
  [MENU_RECIPE_SUMMARY_STATUS.MISSING]: '미작성',
  [MENU_RECIPE_SUMMARY_STATUS.NEEDS_PRICE]: '단가 확인',
  [MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY]: '수량 확인',
  [MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED]: '미지원',
};

function recipeStatusLabel(summary) {
  if (summary?.status === MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY) {
    const direct = summary.missingDirectQuantityCount || 0;
    const common = summary.missingCommonQuantityCount || 0;
    if (common > 0 && direct === 0) return '공통수량 확인';
    if (common > 0 && direct > 0) return '수량/공통 확인';
  }
  if (summary?.status === MENU_RECIPE_SUMMARY_STATUS.NEEDS_PRICE) {
    const direct = summary.missingDirectPriceCount || 0;
    const common = summary.missingCommonPriceCount || 0;
    if (common > 0 && direct === 0) return '공통단가 확인';
    if (common > 0 && direct > 0) return '단가/공통 확인';
  }
  return RECIPE_STATUS_LABEL[summary?.status] || '확인';
}

export function MenuRecipeCostCell({ summary }) {
  if (!summary) {
    return <span style={{ fontSize: 11, color: 'var(--text-4)' }}>계산 중</span>;
  }

  const style =
    RECIPE_STATUS_STYLE[summary.status] || RECIPE_STATUS_STYLE[MENU_RECIPE_SUMMARY_STATUS.MISSING];
  const label = recipeStatusLabel(summary);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
      <span
        style={{
          padding: '2px 7px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          ...style,
        }}
      >
        {label}
      </span>
      {summary.hasRecipe && (
        <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {formatNumber(summary.totalCost)}원
          {summary.costRate != null ? ` · ${formatPercent(summary.costRate)}` : ''}
        </span>
      )}
    </div>
  );
}
