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
import { makeDetailRecipePage } from '@/components/cost/shared/makeDetailRecipePage';

export default makeDetailRecipePage({
  hookOpts: {
    category: '사이드',
    fetchRecipeMap: getSideRecipeMap,
    upsertRecipe: upsertSideRecipe,
    calcCost: sideTotalCost,
  },
  deleteRecipe: deleteSideRecipe,
  breadcrumb: ['원가계산', '사이드'],
  title: '사이드 메뉴 원가',
  noun: '사이드',
  emptySub: '메뉴 판매가에 등록된 사이드 메뉴가 없습니다',
  useSummaryContent: ({ summaryRows }) => (
    <SimpleSummaryTable rows={summaryRows} showSize={false} />
  ),
  DetailCard: SideDetailCard,
  EditModal: SideDetailEditModal,
  emptyTitle: '사이드 메뉴가 없습니다',
  emptyHint: (
    <>
      메뉴 마스터에서 기본 코드를 등록하고 판매가로 내보내기를 실행하세요 (예:{' '}
      <code>S-CHK-001</code>, <code>S-SPG-001</code>).
    </>
  ),
  footerLabel: '원가 합계',
});
