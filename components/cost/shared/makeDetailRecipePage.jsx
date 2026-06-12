'use client';
import { useDetailRecipePage } from '@/hooks/useDetailRecipePage';
import { CostDetailView } from './CostDetailView';
import { showToast } from '@/components/Toast';

/**
 * detail recipe page 팩토리.
 * @param {object} config
 * @param {object} config.hookOpts - useDetailRecipePage 옵션 (category, fetchRecipeMap, upsertRecipe, calcCost, extraFetch?)
 * @param {function} config.deleteRecipe - (id: string) => Promise<void>
 * @param {string[]} config.breadcrumb
 * @param {string} config.title
 * @param {string} config.noun
 * @param {string} config.emptySub
 * @param {function} config.useSummaryContent - custom hook: (page) => JSX — 훅 호출 시 "use"로 시작하는 함수로 선언할 것
 * @param {React.ComponentType} config.DetailCard
 * @param {React.ComponentType} config.EditModal
 * @param {string} config.emptyTitle
 * @param {React.ReactNode} config.emptyHint
 * @param {string} config.footerLabel
 */
export function makeDetailRecipePage({
  hookOpts,
  deleteRecipe,
  breadcrumb,
  title,
  noun,
  emptySub,
  useSummaryContent,
  DetailCard,
  EditModal,
  emptyTitle,
  emptyHint,
  footerLabel,
}) {
  return function Page() {
    const page = useDetailRecipePage(hookOpts);
    const summaryContent = useSummaryContent(page);
    const { target, setTarget, handleSave, reload } = page;

    async function handleDeleteRecipes(ids) {
      await Promise.all(ids.map(id => deleteRecipe(id)));
      showToast(`${ids.length}개 세부 레시피 삭제 완료`, 'ok');
      await reload();
    }

    return (
      <CostDetailView
        {...page}
        breadcrumb={breadcrumb}
        title={title}
        noun={noun}
        emptySub={emptySub}
        summaryContent={summaryContent}
        DetailCard={DetailCard}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
        footerLabel={footerLabel}
        onDeleteRecipes={handleDeleteRecipes}
        modal={
          target && (
            <EditModal
              menu={target.menu}
              initial={target.recipe}
              onSave={handleSave}
              onClose={() => setTarget(null)}
            />
          )
        }
      />
    );
  };
}
