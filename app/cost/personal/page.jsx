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
import { makeDetailRecipePage } from '@/components/cost/shared/makeDetailRecipePage';

export default makeDetailRecipePage({
  hookOpts: {
    category: '1인피자',
    fetchRecipeMap: getPersonalRecipeMap,
    upsertRecipe: upsertPersonalRecipe,
    calcCost: personalTotalCost,
  },
  deleteRecipe: deletePersonalRecipe,
  breadcrumb: ['원가계산', '1인피자'],
  title: '1인피자 원가',
  noun: '1인피자',
  emptySub: '메뉴 판매가에 등록된 1인피자 메뉴가 없습니다',
  useSummaryContent: ({ summaryRows }) => (
    <SimpleSummaryTable rows={summaryRows} showSize={false} />
  ),
  DetailCard: PersonalDetailCard,
  EditModal: PersonalDetailEditModal,
  emptyTitle: '1인피자 메뉴가 없습니다',
  emptyHint: <>메뉴 판매가에서 1인피자 분류로 등록해주세요 (예: <code>IP-001</code>).</>,
  footerLabel: '원가 합계',
});
