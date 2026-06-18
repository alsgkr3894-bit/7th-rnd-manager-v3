'use client';

import { ModalFrame } from '@/components/ui/ModalFrame';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import { EMPTY_TOPPING_PRICE_MAP } from './toppingUtils';

function ToppingFieldLabel({ children, marginBottom = 4 }) {
  return (
    <label
      style={{
        fontSize: 12,
        color: 'var(--text-3)',
        display: 'block',
        marginBottom,
      }}
    >
      {children}
    </label>
  );
}

function LinkedIngredientPanel({ form, onClear }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 12px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface-2)',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 800 }}>
          {form.ingredientName || '식자재명 없음'}
        </div>
        <div className="mono muted" style={{ fontSize: 12, marginTop: 2 }}>
          {form.productCode || '제품코드 없음'}
        </div>
      </div>
      <button className="btn sm ghost" type="button" onClick={onClear}>
        연결 해제
      </button>
    </div>
  );
}

export function ToppingEditModal({
  modal,
  form,
  onForm,
  values,
  onValues,
  safeIngredients,
  onIngredient,
  onClearIngredient,
  saving,
  onSave,
  onClose,
}) {
  return (
    <ModalFrame
      title={modal === 'add' ? '추가토핑 추가' : '추가토핑 편집'}
      onClose={onClose}
      width="min(720px, 96vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-row two" style={{ marginTop: 0 }}>
          <div>
            <ToppingFieldLabel>추가토핑명 *</ToppingFieldLabel>
            <input
              className="input"
              value={form.toppingName}
              onChange={event => onForm(prev => ({ ...prev, toppingName: event.target.value }))}
              placeholder="예: 페퍼로니 추가"
            />
          </div>
          <div>
            <ToppingFieldLabel>추가토핑 코드</ToppingFieldLabel>
            <input
              className="input"
              value={form.toppingCode}
              onChange={event => onForm(prev => ({ ...prev, toppingCode: event.target.value }))}
              placeholder="미입력 시 자동 생성"
            />
          </div>
        </div>

        <div>
          <ToppingFieldLabel marginBottom={6}>식자재코드 연결</ToppingFieldLabel>
          {form.productCode || form.ingredientName ? (
            <LinkedIngredientPanel form={form} onClear={onClearIngredient} />
          ) : (
            <IngredientSearch
              allMeta={safeIngredients}
              unitPriceMap={EMPTY_TOPPING_PRICE_MAP}
              alreadyAdded={[]}
              onSelect={onIngredient}
              style={{ marginTop: 0 }}
            />
          )}
        </div>

        <div>
          <ToppingFieldLabel marginBottom={8}>영양성분 (1회 제공량 기준)</ToppingFieldLabel>
          <NutritionGrid
            values={values}
            onChange={(key, value) => onValues(prev => ({ ...prev, [key]: value }))}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn" type="button" onClick={onClose}>
          취소
        </button>
        <button className="btn primary" type="button" onClick={onSave} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </ModalFrame>
  );
}
