'use client';
import { getSetRecipeMap, upsertSetRecipe, setTotalCost } from '@/lib/cost/set-detail';
import { SetDetailCard } from '@/components/cost/set-detail/SetDetailCard';
import { SetDetailEditModal } from '@/components/cost/set-detail/SetDetailEditModal';
import { SimpleSummaryTable } from '@/components/cost/shared/SimpleSummaryTable';
import { CostDetailView } from '@/components/cost/shared/CostDetailView';
import { useDetailRecipePage } from '@/hooks/useDetailRecipePage';

export default function Page() {
  const page = useDetailRecipePage({
    category:       '세트박스',
    fetchRecipeMap: getSetRecipeMap,
    upsertRecipe:   upsertSetRecipe,
    calcCost:       setTotalCost,
  });
  const { summaryRows, target, setTarget, handleSave } = page;

  return (
    <CostDetailView
      {...page}
      breadcrumb={['원가계산', '세트박스']}
      title="세트박스 원가"
      noun="세트박스"
      emptySub="메뉴 판매가에 등록된 세트박스가 없습니다"
      summaryContent={<SimpleSummaryTable rows={summaryRows} showSize={false}/>}
      DetailCard={SetDetailCard}
      emptyTitle="세트박스 메뉴가 없습니다"
      emptyHint={<>메뉴 판매가에서 세트박스 분류로 등록해주세요 (예: <code>ST-001</code>).</>}
      footerLabel="원가 합계"
      modal={target && (
        <SetDetailEditModal
          menu={target.menu}
          initial={target.recipe}
          onSave={handleSave}
          onClose={() => setTarget(null)}
        />
      )}
    />
  );
}
