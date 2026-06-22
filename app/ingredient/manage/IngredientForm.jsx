'use client';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { AllergenSection, OriginSection, PhotoSection } from './IngredientFormSections';
import {
  BasicIngredientFields,
  IngredientCostFields,
  IngredientNameField,
} from './IngredientFormFields';
import { IngredientUsageSection } from './IngredientUsageSection';
import { useIngredientUsageSummary } from './useIngredientUsageSummary';
import { JetteLinkedSourcePanel } from './JetteLinkedSourcePanel';
import { JettePriceImportField } from './JettePriceImportField';
import { useIngredientFormController } from './useIngredientFormController';
import { ImpactPreviewPanel } from '@/components/impact/ImpactPreviewPanel';

export function IngredientForm({
  initial,
  copyFrom = null,
  onSave,
  onClose,
  extraCategories = [],
  originSuggestions = { names: [], countries: [] },
  existingProductCodes = [],
  jettePriceRows = [],
}) {
  const ctrl = useIngredientFormController({
    initial,
    copyFrom,
    existingProductCodes,
    onSave,
    onClose,
    extraCategories,
  });

  const usageSummary = useIngredientUsageSummary(initial);

  const packagingPhotoInputRef = useRef(null);
  const detailPhotoInputRef = useRef(null);
  const actualPhotoInputRef = useRef(null);
  const photoInputRefs = {
    packaging: packagingPhotoInputRef,
    detail: detailPhotoInputRef,
    actual: actualPhotoInputRef,
  };

  const {
    form,
    tagInput,
    setTagInput,
    customCat,
    setCustomCat,
    saving,
    errors,
    isJetteLinked,
    catOptions,
    isNew,
    title,
    formPhotos,
    datalistId,
    set,
    addTag,
    removeTag,
    applyJettePriceDraft,
    handleSubmit,
    handlePhotoFile,
    removePhoto,
  } = ctrl;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.4)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(820px, 96vw)',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* sticky 헤더 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
            borderBottom: '1px solid var(--divider)',
            background: 'var(--surface)',
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
            {copyFrom && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                원본: {copyFrom.ingredientName || copyFrom.displayName || copyFrom.productName}
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn ghost"
            style={{ padding: '4px 8px', flexShrink: 0 }}
            onClick={onClose}
          >
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 스크롤 본문 */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px' }}>
          {isJetteLinked && <JetteLinkedSourcePanel ingredient={initial} />}

          {isJetteLinked && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              직접 수정 가능한 항목
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            aria-busy={saving}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {!isJetteLinked && (
              <JettePriceImportField
                priceRows={jettePriceRows}
                form={form}
                existingProductCodes={existingProductCodes}
                onApply={applyJettePriceDraft}
              />
            )}

            <IngredientNameField
              form={form}
              errors={errors}
              isJetteLinked={isJetteLinked}
              initial={initial}
              onSet={set}
            />

            <BasicIngredientFields
              form={form}
              errors={errors}
              isJetteLinked={isJetteLinked}
              catOptions={catOptions}
              customCat={customCat}
              tagInput={tagInput}
              datalistId={datalistId}
              onSet={set}
              onToggleCustomCat={() => {
                setCustomCat(v => !v);
                set('category', '');
              }}
              onTagInputChange={setTagInput}
              onAddTag={addTag}
              onRemoveTag={removeTag}
            />

            <IngredientCostFields
              form={form}
              errors={errors}
              isJetteLinked={isJetteLinked}
              onSet={set}
            />

            {initial && initial.productCode && (
              <ImpactPreviewPanel
                productCode={initial.productCode}
                oldPrice={initial.priceOverride ?? initial.priceWithTax ?? null}
                newPrice={form.priceOverride !== '' ? Number(form.priceOverride) : null}
                oldBaseQuantity={initial.baseQuantity ?? null}
                newBaseQuantity={
                  form.baseQuantity !== ''
                    ? Number(form.baseQuantity)
                    : (initial.baseQuantity ?? null)
                }
              />
            )}

            {initial && !usageSummary.loading && usageSummary.rows.length > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-3)',
                  background: 'var(--surface-2)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  marginBottom: -4,
                }}
              >
                <Icon.alert
                  style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 4 }}
                />
                원산지·알레르기 변경 시 <b>{usageSummary.rows.length}개 메뉴</b> 출력물에 즉시
                반영됩니다.
              </div>
            )}

            <OriginSection
              origin={form.origin || []}
              originHidden={form.originHidden}
              originSuggestions={originSuggestions}
              onSet={set}
            />

            <AllergenSection allergens={form.allergens || []} onSet={set} />

            <PhotoSection
              formPhotos={formPhotos}
              photoInputRefs={photoInputRefs}
              onPhotoFile={handlePhotoFile}
              onRemovePhoto={removePhoto}
            />

            {initial && (
              <IngredientUsageSection
                loading={usageSummary.loading}
                rows={usageSummary.rows}
                error={usageSummary.error}
              />
            )}
          </form>
        </div>

        {/* sticky 푸터 */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            padding: '12px 24px',
            borderTop: '1px solid var(--divider)',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={saving}
            onClick={() => handleSubmit({ preventDefault() {} })}
          >
            {saving ? '저장 중…' : isNew ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
