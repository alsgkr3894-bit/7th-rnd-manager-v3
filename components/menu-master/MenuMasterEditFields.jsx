'use client';

import {
  NoteField,
  OriginAllergenExcludeField,
  PriceField,
  StatusField,
} from '@/components/menu-master/MenuMasterCommercialFields';
import {
  CategoryAndSizeFields,
  MenuCodeField,
  MenuNameField,
} from '@/components/menu-master/MenuMasterIdentityFields';
import { MenuRecipeSection } from '@/components/menu-master/MenuRecipeSection';

export function MenuMasterEditFields({
  row,
  isNew,
  form,
  errors,
  setField,
  setErrors,
  defaultPrice,
  presetCategories,
  onRecipeSaved,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MenuCodeField
        row={row}
        isNew={isNew}
        value={form.menuCode}
        error={errors.menuCode}
        setField={setField}
        setErrors={setErrors}
      />

      <MenuNameField
        value={form.menuName}
        error={errors.menuName}
        setField={setField}
        setErrors={setErrors}
      />

      <CategoryAndSizeFields form={form} presetCategories={presetCategories} setField={setField} />

      <PriceField
        value={form.price}
        error={errors.price}
        defaultPrice={defaultPrice}
        setField={setField}
      />

      <StatusField value={form.status} setField={setField} />

      <NoteField value={form.note} setField={setField} />

      <OriginAllergenExcludeField value={form.excludeFromOrigin} setField={setField} />

      {!isNew && form.menuCode && form.category && (
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
          <MenuRecipeSection
            menuCode={form.menuCode}
            menuName={form.menuName}
            category={form.category}
            size={form.size || '단일'}
            sellingPrice={form.price}
            onSaved={onRecipeSaved}
          />
        </div>
      )}
    </div>
  );
}
