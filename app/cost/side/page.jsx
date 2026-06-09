'use client';
import {
  getSideRecipeMap,
  upsertSideRecipe,
  deleteSideRecipe,
  sideTotalCost,
} from '@/lib/cost/side-detail';
import { SideDetailCard } from '@/components/cost/side-detail/SideDetailCard';
import { SideDetailEditModal } from '@/components/cost/side-detail/SideDetailEditModal';
import { SimpleSummaryTable } from '@/components/cost/shared/SimpleSummaryTable';
import { CostDetailView } from '@/components/cost/shared/CostDetailView';
import { useDetailRecipePage } from '@/hooks/useDetailRecipePage';
import { showToast } from '@/components/Toast';

export default function Page() {
  const page = useDetailRecipePage({
    category: '사이드',
    fetchRecipeMap: getSideRecipeMap,
    upsertRecipe: upsertSideRecipe,
    calcCost: sideTotalCost,
  });
  const { summaryRows, target, setTarget, handleSave, reload } = page;

  async function handleDeleteRecipes(ids) {
    await Promise.all(ids.map(id => deleteSideRecipe(id)));
    showToast(`${ids.length}개 세부 레시피 삭제 완료`, 'ok');
    await reload();
  }

  return (
    <CostDetailView
      {...page}
      breadcrumb={['원가계산', '사이드']}
      title="사이드 메뉴 원가"
      noun="사이드"
      emptySub="메뉴 판매가에 등록된 사이드 메뉴가 없습니다"
      summaryContent={<SimpleSummaryTable rows={summaryRows} showSize={false} />}
      DetailCard={SideDetailCard}
      emptyTitle="사이드 메뉴가 없습니다"
      emptyHint={
        <>
          메뉴 마스터에서 기본 코드를 등록하고 판매가로 내보내기를 실행하세요 (예:{' '}
          <code>S-CHK-001</code>, <code>S-SPG-001</code>).
        </>
      }
      footerLabel="원가 합계"
      onDeleteRecipes={handleDeleteRecipes}
      modal={
        target && (
          <SideDetailEditModal
            menu={target.menu}
            initial={target.recipe}
            onSave={handleSave}
            onClose={() => setTarget(null)}
          />
        )
      }
    />
  );
}
