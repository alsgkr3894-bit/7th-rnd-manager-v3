'use client';

import {
  HiddenField,
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
import { MenuMasterPhotoField } from '@/components/menu-master/MenuMasterPhotoField';
import { MenuRecipeSection } from '@/components/menu-master/MenuRecipeSection';
import { MenuNutritionPreview } from '@/components/menu-master/MenuNutritionPreview';

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
  recipeSectionRef,
  initialFocus,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── 기본 정보 ─────────────────────────── */}
      <div>
        <SectionDivider title="기본 정보" />
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <MenuMasterPhotoField photo={form.photo} onChange={photo => setField('photo', photo)} />
          <div
            style={{
              flex: 1,
              minWidth: 0,
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
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <OriginAllergenExcludeField value={form.excludeFromOrigin} setField={setField} />
          <HiddenField value={form.hidden} setField={setField} />
        </div>
      </div>

      {/* ── 레시피 / 원가 ─────────────────────── */}
      {/* 메뉴 추가 중(isNew)에는 아직 코드를 안 적었어도 카테고리만 있으면 레시피를 먼저
          입력할 수 있다 — 저장 시 메뉴 기본정보와 함께 저장된다(draft 모드). */}
      {(isNew ? form.category : form.menuCode && form.category) && (
        <div
          data-menu-master-section="recipe"
          style={{ borderTop: '1px solid var(--divider)', paddingTop: 20 }}
        >
          <SectionDivider title="레시피 / 원가" />
          <MenuRecipeSection
            ref={recipeSectionRef}
            initialFocus={initialFocus}
            menuCode={form.menuCode}
            sourceMenuCode={row?.menuCode || form.menuCode}
            menuName={form.menuName}
            category={form.category}
            size={form.size || '단일'}
            sellingPrice={form.price}
            onSaved={onRecipeSaved}
            draft={isNew}
          />
        </div>
      )}

      {/* ── 영양성분 출력 미리보기 ────────────── */}
      {!isNew && row?.menuCode && (
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 20 }}>
          <MenuNutritionPreview
            menuCode={row.menuCode}
            menuName={row.menuName}
            category={row.category}
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
