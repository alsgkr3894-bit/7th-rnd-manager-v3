'use client';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';
import { EMPTY_UNIT_PRICE_MAP } from './derivedCompositionUtils';
import { DerivedIngredientAmountRows } from './DerivedIngredientAmountRows';

function FieldLabel({ children, style }) {
  return (
    <label
      style={{
        fontSize: 12,
        color: 'var(--text-3)',
        display: 'block',
        marginBottom: 4,
        ...style,
      }}
    >
      {children}
    </label>
  );
}

function BaseMenuEmptyNotice({ onMove }) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: '10px 12px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        color: 'var(--text-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 12 }}>베이스 영양성분 탭에서 메뉴를 먼저 등록해주세요</span>
      <button type="button" className="btn sm" onClick={onMove}>
        이동
      </button>
    </div>
  );
}

function EmptyIngredientNotice() {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        color: 'var(--text-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 12 }}>
        등록된 식자재가 없습니다. 파생 메뉴 영양성분은 베이스 메뉴 직접 입력값과 엣지 조정값만
        사용하며, 식자재 영양값은 자동 반영하지 않습니다.
      </span>
    </div>
  );
}

export function DerivedCompositionModal({
  modal,
  form,
  setForm,
  safeMenus,
  ingredientOptions,
  ingredientMetaByCode,
  saving,
  onClose,
  onOpenBaseTab,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateIngredientAmount,
  onSave,
}) {
  if (!modal) return null;

  function handleMoveToBaseTab() {
    onClose();
    onOpenBaseTab();
  }

  return (
    <ModalFrame
      title={modal === 'add' ? '파생 메뉴 추가' : '파생 메뉴 편집'}
      onClose={onClose}
      width="min(620px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <FieldLabel>파생 메뉴명 *</FieldLabel>
          <input
            className="input"
            value={form.menuName}
            onChange={event => setForm(prev => ({ ...prev, menuName: event.target.value }))}
            placeholder="예: 컨츄리마요치킨"
          />
        </div>
        <div>
          <FieldLabel>베이스 메뉴 *</FieldLabel>
          <select
            className="input"
            value={form.baseMenuCode}
            onChange={event => setForm(prev => ({ ...prev, baseMenuCode: event.target.value }))}
          >
            <option value="">선택하세요</option>
            {safeMenus.map((menu, index) => {
              const menuCode = asDisplayText(menu.menuCode);
              const menuName = asDisplayText(menu.menuName, menuCode || `메뉴 ${index + 1}`);
              return (
                <option key={menu.id || menuCode || index} value={menuCode}>
                  {menuName}
                </option>
              );
            })}
          </select>
          {safeMenus.length === 0 && <BaseMenuEmptyNotice onMove={handleMoveToBaseTab} />}
        </div>
        <div>
          <FieldLabel style={{ marginBottom: 8 }}>추가 식자재</FieldLabel>
          {ingredientOptions.length === 0 ? (
            <EmptyIngredientNotice />
          ) : (
            <>
              <IngredientSearch
                allMeta={ingredientOptions}
                unitPriceMap={EMPTY_UNIT_PRICE_MAP}
                alreadyAdded={asStringArray(form.ingredientCodes)}
                onSelect={onAddIngredient}
                style={{ marginTop: 0 }}
              />
              <DerivedIngredientAmountRows
                form={form}
                ingredientMetaByCode={ingredientMetaByCode}
                onUpdateIngredientAmount={onUpdateIngredientAmount}
                onRemoveIngredient={onRemoveIngredient}
              />
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn" onClick={onClose}>
          취소
        </button>
        <button
          className="btn primary"
          onClick={onSave}
          disabled={saving || safeMenus.length === 0}
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </ModalFrame>
  );
}
