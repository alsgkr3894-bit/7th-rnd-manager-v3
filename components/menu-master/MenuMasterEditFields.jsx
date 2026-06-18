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

function SectionDivider({ title }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 12,
      }}
    >
      {title}
    </div>
  );
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── 기본 정보 ─────────────────────────── */}
      <div>
        <SectionDivider title="기본 정보" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <MenuCodeField
            row={row}
            isNew={isNew}
            value={form.menuCode}
            error={errors.menuCode}
            setField={setField}
            setErrors={setErrors}
            autoFocus={isNew}
          />
          <MenuNameField
            value={form.menuName}
            error={errors.menuName}
            setField={setField}
            setErrors={setErrors}
            autoFocus={!isNew}
          />
        </div>
      </div>

      {/* ── 분류 / 판매 ───────────────────────── */}
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 20 }}>
        <SectionDivider title="분류 / 판매" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <CategoryAndSizeFields
            form={form}
            presetCategories={presetCategories}
            setField={setField}
          />
          <PriceField
            value={form.price}
            error={errors.price}
            defaultPrice={defaultPrice}
            setField={setField}
          />
          <StatusField value={form.status} setField={setField} />
        </div>
        <div style={{ marginTop: 12 }}>
          <OriginAllergenExcludeField value={form.excludeFromOrigin} setField={setField} />
        </div>
      </div>

      {/* ── 레시피 / 원가 ─────────────────────── */}
      {!isNew && form.menuCode && form.category && (
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 20 }}>
          <SectionDivider title="레시피 / 원가" />
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

      {/* ── 메모 ──────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 20 }}>
        <SectionDivider title="메모" />
        <NoteField value={form.note} setField={setField} />
      </div>
    </div>
  );
}
