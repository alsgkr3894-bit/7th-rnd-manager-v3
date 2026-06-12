'use client';
import {
  getSetRecipeMap,
  upsertSetRecipe,
  deleteSetRecipe,
  setTotalCost,
} from '@/lib/cost/set-detail';
import { SetDetailCard } from '@/components/cost/set-detail/SetDetailCard';
import { SetDetailEditModal } from '@/components/cost/set-detail/SetDetailEditModal';
import { SimpleSummaryTable } from '@/components/cost/shared/SimpleSummaryTable';
import { makeDetailRecipePage } from '@/components/cost/shared/makeDetailRecipePage';

export default makeDetailRecipePage({
  hookOpts: {
    category: '세트박스',
    fetchRecipeMap: getSetRecipeMap,
    upsertRecipe: upsertSetRecipe,
    calcCost: setTotalCost,
  },
  deleteRecipe: deleteSetRecipe,
  breadcrumb: ['원가계산', '세트박스'],
  title: '세트박스 원가',
  noun: '세트박스',
  emptySub: '메뉴 판매가에 등록된 세트박스가 없습니다',
  useSummaryContent: ({ summaryRows }) => (
    <SimpleSummaryTable rows={summaryRows} showSize={false} />
  ),
  DetailCard: SetDetailCard,
  EditModal: SetDetailEditModal,
  emptyTitle: '세트박스 메뉴가 없습니다',
  emptyHint: (
    <>
      메뉴 판매가에서 세트박스 분류로 등록해주세요 (예: <code>ST-001</code>).
    </>
  ),
  footerLabel: '원가 합계',
});
