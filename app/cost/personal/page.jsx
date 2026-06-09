'use client';
import {
  getPersonalRecipeMap,
  upsertPersonalRecipe,
  deletePersonalRecipe,
  personalTotalCost,
} from '@/lib/cost/personal-detail';
import { PersonalDetailCard } from '@/components/cost/personal-detail/PersonalDetailCard';
import { PersonalDetailEditModal } from '@/components/cost/personal-detail/PersonalDetailEditModal';
import { SimpleSummaryTable } from '@/components/cost/shared/SimpleSummaryTable';
import { CostDetailView } from '@/components/cost/shared/CostDetailView';
import { useDetailRecipePage } from '@/hooks/useDetailRecipePage';
import { showToast } from '@/components/Toast';

export default function Page() {
  const page = useDetailRecipePage({
    category: '1인피자',
    fetchRecipeMap: getPersonalRecipeMap,
    upsertRecipe: upsertPersonalRecipe,
    calcCost: personalTotalCost,
  });
  const { summaryRows, target, setTarget, handleSave, reload } = page;

  async function handleDeleteRecipes(ids) {
    await Promise.all(ids.map(id => deletePersonalRecipe(id)));
    showToast(`${ids.length}개 세부 레시피 삭제 완료`, 'ok');
    await reload();
  }

  return (
    <CostDetailView
      {...page}
      breadcrumb={['원가계산', '1인피자']}
      title="1인피자 원가"
      noun="1인피자"
      emptySub="메뉴 판매가에 등록된 1인피자 메뉴가 없습니다"
      summaryContent={<SimpleSummaryTable rows={summaryRows} showSize={false} />}
      DetailCard={PersonalDetailCard}
      emptyTitle="1인피자 메뉴가 없습니다"
      emptyHint={
        <>
          메뉴 판매가에서 1인피자 분류로 등록해주세요 (예: <code>IP-001</code>).
        </>
      }
      footerLabel="원가 합계"
      onDeleteRecipes={handleDeleteRecipes}
      modal={
        target && (
          <PersonalDetailEditModal
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
