'use client';
import { useMemo } from 'react';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { GroupEditorBasicFields } from './editor/GroupEditorBasicFields';
import { GroupEditorCategoryChips } from './editor/GroupEditorCategoryChips';
import { GroupEditorHeader } from './editor/GroupEditorHeader';
import { GroupEditorSizeFields } from './editor/GroupEditorSizeFields';
import { GroupIngredientsTable } from './editor/GroupIngredientsTable';
import { computeGroupCostBySizes, createGroupIngredientLine } from './editor/groupEditorUtils';

export function GroupEditor({
  draft,
  setDraft,
  allMeta,
  unitPriceMap,
  isNew,
  saving,
  onSave,
  onDelete,
  onCancel,
}) {
  const sizeLabels = useMemo(() => draft.sizes.filter(Boolean), [draft.sizes]);

  function setField(key, val) {
    setDraft(d => ({ ...d, [key]: val }));
  }

  function setSize(idx, val) {
    setDraft(d => {
      const s = [...d.sizes];
      s[idx] = val;
      return { ...d, sizes: s };
    });
  }
  function addSize() {
    setDraft(d => ({ ...d, sizes: [...d.sizes, ''] }));
  }
  function removeSize(idx) {
    setDraft(d => ({ ...d, sizes: d.sizes.filter((_, i) => i !== idx) }));
  }

  function toggleCategory(cat) {
    setDraft(d => {
      const cats = d.defaultCategories || [];
      return {
        ...d,
        defaultCategories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat],
      };
    });
  }

  function setIngredientQty(lineIdx, sizeLabel, val) {
    setDraft(d => ({
      ...d,
      ingredients: d.ingredients.map((line, i) =>
        i !== lineIdx ? line : { ...line, quantities: { ...line.quantities, [sizeLabel]: val } }
      ),
    }));
  }

  function addIngredient(meta) {
    setDraft(d => ({
      ...d,
      ingredients: [...d.ingredients, createGroupIngredientLine(meta, unitPriceMap, sizeLabels)],
    }));
  }

  function removeIngredient(idx) {
    setDraft(d => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== idx) }));
  }

  const costBySizes = useMemo(() => {
    return computeGroupCostBySizes(draft.ingredients, sizeLabels, unitPriceMap);
  }, [draft.ingredients, sizeLabels, unitPriceMap]);

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <GroupEditorHeader
        draft={draft}
        isNew={isNew}
        saving={saving}
        onSave={onSave}
        onDelete={onDelete}
        onCancel={onCancel}
      />

      <GroupEditorBasicFields draft={draft} onField={setField} />

      <GroupEditorSizeFields
        sizes={draft.sizes}
        onSize={setSize}
        onAdd={addSize}
        onRemove={removeSize}
      />

      <GroupEditorCategoryChips
        selectedCategories={draft.defaultCategories || []}
        onToggle={toggleCategory}
      />

      <GroupIngredientsTable
        ingredients={draft.ingredients}
        sizeLabels={sizeLabels}
        unitPriceMap={unitPriceMap}
        costBySizes={costBySizes}
        onQty={setIngredientQty}
        onRemove={removeIngredient}
      />

      <IngredientSearch
        allMeta={allMeta}
        unitPriceMap={unitPriceMap}
        onSelect={addIngredient}
        alreadyAdded={draft.ingredients.map(i => i.productCode)}
      />
    </div>
  );
}
