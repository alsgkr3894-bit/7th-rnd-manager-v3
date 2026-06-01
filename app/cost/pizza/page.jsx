'use client';
import { useMemo } from 'react';
import { getPizzaRecipeMap, upsertPizzaRecipe, pizzaBaseCost } from '@/lib/cost/pizza-detail';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { buildPizzaSummary } from '@/lib/cost/pizza-summary';
import { PizzaDetailCard } from '@/components/cost/pizza-detail/PizzaDetailCard';
import { PizzaDetailEditModal } from '@/components/cost/pizza-detail/PizzaDetailEditModal';
import { PizzaSummaryTable } from '@/components/cost/pizza-summary/PizzaSummaryTable';
import { CostDetailView } from '@/components/cost/shared/CostDetailView';
import { useDetailRecipePage } from '@/hooks/useDetailRecipePage';

export default function Page() {
  const page = useDetailRecipePage({
    category:       '피자',
    fetchRecipeMap: getPizzaRecipeMap,
    upsertRecipe:   upsertPizzaRecipe,
    calcCost:       pizzaBaseCost,
    extraFetch:     getAllEdges,         // 종합표용 엣지 목록
  });
  const { menus, recipeMap, extraData: edges, target, setTarget, handleSave } = page;

  // 종합 매트릭스 (메뉴 × 4엣지) — 엣지 정보가 필요해 page 레벨에서 계산
  const summary = useMemo(
    () => buildPizzaSummary({ menus, recipeMap, edges: edges || [] }),
    [menus, recipeMap, edges]
  );

  return (
    <CostDetailView
      {...page}
      breadcrumb={['원가계산', '피자']}
      title="피자 원가"
      noun="피자 메뉴"
      emptySub="메뉴 판매가에 등록된 피자 메뉴가 없습니다 — 먼저 메뉴 판매가에서 등록해주세요"
      summaryContent={<PizzaSummaryTable rows={summary}/>}
      DetailCard={PizzaDetailCard}
      emptyTitle="피자 메뉴가 없습니다"
      emptyHint={<>먼저 <b>메뉴 마스터</b>에서 기본 코드를 등록하고 <b>판매가로 내보내기</b>를 실행하세요.<br/>메뉴코드 형식: <code>P-OR-005-L</code>, <code>P-OR-005-R</code></>}
      footerLabel="베이스 원가 합계"
      modal={target && (
        <PizzaDetailEditModal
          menu={target.menu}
          initial={target.recipe}
          onSave={handleSave}
          onClose={() => setTarget(null)}
        />
      )}
    />
  );
}
