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
  [MENU_RECIPE_SUMMARY_STATUS.EDGE]: '엣지 원가',
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
  if (summary?.status === MENU_RECIPE_SUMMARY_STATUS.EDGE && !summary.hasRecipe)
    return '엣지 미등록';
  return RECIPE_STATUS_LABEL[summary?.status] || '확인';
}

/** 엣지 원가 셀 본문: 석쇠(추가 원가 없음)·L만 있는 경우(씬바사삭)·L/R(치즈·골드) 세 형태. */
function edgeDetailText(summary) {
  const sizeCosts = summary.sizeCosts || {};
  const sizes = Object.keys(sizeCosts);
  if (sizes.length === 0) return '기본 도우 · 추가 원가 없음';
  const parts = ['L', 'R']
    .filter(s => sizeCosts[s] != null)
    .map(s => `${s} ${formatNumber(sizeCosts[s])}원`);
  const rate = summary.costRate != null ? ` · ${formatPercent(summary.costRate)}` : '';
  return `${parts.join(' / ')}${rate}`;
}

export function MenuRecipeCostCell({ summary }) {
  if (!summary) {
    return <span style={{ fontSize: 11, color: 'var(--text-4)' }}>계산 중</span>;
  }

  const isEdge = summary.status === MENU_RECIPE_SUMMARY_STATUS.EDGE;
  const styleStatus = isEdge
    ? summary.hasRecipe
      ? MENU_RECIPE_SUMMARY_STATUS.READY
      : MENU_RECIPE_SUMMARY_STATUS.MISSING
    : summary.status;
  const style =
    RECIPE_STATUS_STYLE[styleStatus] || RECIPE_STATUS_STYLE[MENU_RECIPE_SUMMARY_STATUS.MISSING];
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
      {isEdge && summary.hasRecipe && (
        <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {edgeDetailText(summary)}
        </span>
      )}
      {!isEdge && summary.hasRecipe && (
        <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {formatNumber(summary.totalCost)}원
          {summary.costRate != null ? ` · ${formatPercent(summary.costRate)}` : ''}
        </span>
      )}
    </div>
  );
}
