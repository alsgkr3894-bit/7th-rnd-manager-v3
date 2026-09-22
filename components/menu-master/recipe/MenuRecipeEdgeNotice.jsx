'use client';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { summarizeMenuEdge } from '@/lib/menu-master/recipe-summary';
import { formatNumber, formatPercent } from '@/lib/format';
import { MenuRecipeGuardNotice } from './MenuRecipeGuardNotice';

/**
 * MenuRecipeSection이 카테고리 '엣지'라 식자재 레시피 편집을 지원하지 않을 때 대신
 * 보여주는 안내 — 예전엔 "이 카테고리는 레시피 원가를 지원하지 않습니다"만 떴는데,
 * 엣지는 실제로 공통 원가 관리(엣지 관리)에 원가가 있어서 오해하기 쉬웠다
 * (components/menu-master/MenuRecipeCostCell.jsx와 같은 데이터 소스: summarizeMenuEdge).
 */
export function MenuRecipeEdgeNotice({ menu }) {
  const { data: edges, loading } = useDBLoad(getAllEdges, { initialData: [] });

  if (loading) {
    return <MenuRecipeGuardNotice message="엣지 원가를 불러오는 중…" />;
  }

  const summary = summarizeMenuEdge(menu, edges);
  const sizeCosts = summary?.sizeCosts || {};
  const sizeEntries = (summary?.size ? [summary.size] : ['L', 'R']).filter(
    size => sizeCosts[size] != null
  );

  return (
    <div
      style={{
        fontSize: 12,
        color: 'var(--text-3)',
        padding: '10px 12px',
        border: '1px dashed var(--divider)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>
        {summary?.hasRecipe
          ? sizeEntries.length > 0
            ? `엣지 원가 ${sizeEntries
                .map(size => `${size} ${formatNumber(sizeCosts[size])}원`)
                .join(
                  ' / '
                )}${summary.costRate != null ? ` · ${formatPercent(summary.costRate)}` : ''}`
            : '기본 도우 · 추가 원가 없음'
          : '엣지 관리(공통 원가 관리)에 원가 구성이 없습니다'}
      </div>
      <div>
        엣지는 식자재 레시피가 아니라 공통 원가 관리 → 엣지 관리의 사이즈별 구성품 원가를 그대로
        씁니다. 원가 구성은{' '}
        <a href="/cost/recipe" target="_blank" rel="noreferrer">
          공통 원가 관리
        </a>
        에서 수정합니다.
      </div>
    </div>
  );
}
