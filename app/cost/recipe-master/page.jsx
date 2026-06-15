'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { RecipeMasterForm } from '@/components/recipe-master/RecipeMasterForm';
import { RecipeMasterTable } from '@/components/recipe-master/RecipeMasterTable';
import { useRecipeMasterPage } from '@/hooks/useRecipeMasterPage';

export default function Page() {
  const recipeMaster = useRecipeMasterPage();
  const {
    loading,
    saving,
    draft,
    draftKind,
    draftDerived,
    draftTotalCost,
    rows,
    filteredRows,
    recipeItemCount,
    completedRecipeCount,
    pendingRecipeCount,
    search,
    setSearch,
    ingredients,
    load,
    startNew,
    editRow,
    patchDraft,
    patchComponent,
    handleIngredientChange,
    addComponent,
    removeComponent,
    moveComponent,
    saveDraft,
  } = recipeMaster;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴', '레시피 마스터']}
        title="레시피 마스터"
        masterSource
        sub={
          loading
            ? '로딩 중…'
            : `메뉴 ${rows.length}개 · 레시피마스터 ${recipeItemCount}건 · 작성완료 ${completedRecipeCount}건`
        }
        actions={
          <>
            <button className="btn" onClick={startNew} disabled={saving}>
              <Icon.plus style={{ width: 14, height: 14 }} /> 신규
            </button>
            <button className="btn" onClick={load} disabled={saving}>
              <Icon.download style={{ width: 14, height: 14 }} /> 새로고침
            </button>
          </>
        }
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
        <SmallStatCard label="메뉴" value={rows.length} />
        <SmallStatCard label="레시피마스터" value={recipeItemCount} />
        <SmallStatCard label="작성완료" value={completedRecipeCount} />
        <SmallStatCard label="미작성" value={pendingRecipeCount} />
      </div>

      <RecipeMasterForm
        draft={draft}
        draftKind={draftKind}
        draftDerived={draftDerived}
        draftTotalCost={draftTotalCost}
        ingredients={ingredients}
        saving={saving}
        onSubmit={saveDraft}
        onPatchDraft={patchDraft}
        onPatchComponent={patchComponent}
        onIngredientChange={handleIngredientChange}
        onAddComponent={addComponent}
        onRemoveComponent={removeComponent}
        onMoveComponent={moveComponent}
      />

      <RecipeMasterTable
        loading={loading}
        rows={filteredRows}
        search={search}
        onSearch={setSearch}
        onEdit={editRow}
      />
    </main>
  );
}
