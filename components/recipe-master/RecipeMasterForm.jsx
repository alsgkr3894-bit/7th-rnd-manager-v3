'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { MENU_CATEGORIES } from '@/lib/recipe';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { recipeSyncTargetLabel } from '@/lib/recipe-master/sync';

const ALLERGEN_NAME_BY_CODE = Object.fromEntries(
  ALLERGEN_SEED.map(item => [item.allergenCode, item.allergenName])
);

export function RecipeMasterForm({
  draft,
  draftKind,
  draftDerived,
  draftTotalCost,
  ingredients,
  saving,
  onSubmit,
  onPatchDraft,
  onPatchComponent,
  onIngredientChange,
  onAddComponent,
  onRemoveComponent,
  onMoveComponent,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <section
      className="card"
      style={{
        marginTop: 16,
        padding: 18,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: 16,
      }}
    >
      <form onSubmit={handleSubmit} style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <Field label="메뉴코드">
            <input
              className="form-input"
              value={draft.menuCode}
              onChange={event => onPatchDraft({ menuCode: event.target.value })}
              placeholder="P-OR-001-L"
            />
          </Field>
          <Field label="메뉴명">
            <input
              className="form-input"
              value={draft.menuName}
              onChange={event => onPatchDraft({ menuName: event.target.value })}
              placeholder="메뉴명"
            />
          </Field>
          <Field label="카테고리">
            <select
              className="form-input"
              value={draft.category}
              onChange={event => onPatchDraft({ category: event.target.value })}
            >
              {MENU_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <Field label="규격">
            <input
              className="form-input"
              value={draft.size}
              onChange={event => onPatchDraft({ size: event.target.value })}
              placeholder="L"
            />
          </Field>
          <Field label="판매가">
            <input
              className="form-input"
              type="number"
              min="0"
              value={draft.price}
              onChange={event => onPatchDraft({ price: event.target.value })}
              placeholder="0"
            />
          </Field>
        </div>

        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th>원가식자재</th>
                <th style={{ width: 130 }}>제품코드</th>
                <th style={{ width: 90 }}>수량</th>
                <th style={{ width: 80 }}>단위</th>
                <th style={{ width: 110 }}>단가</th>
                <th style={{ width: 110 }}>소계</th>
                <th style={{ width: 112 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {draft.components.map((component, index) => (
                <RecipeComponentRow
                  key={component._key || index}
                  component={component}
                  index={index}
                  onPatchComponent={onPatchComponent}
                  onIngredientChange={onIngredientChange}
                  onRemoveComponent={onRemoveComponent}
                  onMoveComponent={onMoveComponent}
                  componentCount={draft.components.length}
                />
              ))}
            </tbody>
          </table>
          <datalist id="recipe-master-ingredients">
            {ingredients
              .filter(ing => !ing.discontinued && !ing.excluded)
              .map(ing => (
                <option
                  key={asDisplayText(ing.id) || asDisplayText(ing.productCode)}
                  value={asDisplayText(ing.ingredientName || ing.productName)}
                />
              ))}
          </datalist>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
          <button type="button" className="btn" onClick={onAddComponent}>
            <Icon.plus style={{ width: 14, height: 14 }} /> 구성품
          </button>
          <button className="btn primary" type="submit" disabled={saving || !draftKind}>
            {saving ? '저장 중…' : '레시피마스터 저장'}
          </button>
        </div>
      </form>

      <RecipeMasterSummary
        draftKind={draftKind}
        draftTotalCost={draftTotalCost}
        draftDerived={draftDerived}
      />
    </section>
  );
}

function RecipeComponentRow({
  component,
  index,
  onPatchComponent,
  onIngredientChange,
  onRemoveComponent,
  onMoveComponent,
  componentCount,
}) {
  const subtotal = (Number(component.quantity) || 0) * (Number(component.unitPrice) || 0);
  const isFirst = index === 0;
  const isLast = index >= componentCount - 1;

  return (
    <tr>
      <td>
        <input
          className="form-input"
          list="recipe-master-ingredients"
          value={component.ingredientName || ''}
          onChange={event => onIngredientChange(index, event.target.value)}
          placeholder="식자재명"
        />
      </td>
      <td>
        <input
          className="form-input mono"
          value={component.productCode || ''}
          onChange={event => onPatchComponent(index, { productCode: event.target.value })}
        />
      </td>
      <td>
        <input
          className="form-input"
          type="number"
          min="0"
          step="any"
          value={component.quantity ?? ''}
          onChange={event => onPatchComponent(index, { quantity: event.target.value })}
          style={{ textAlign: 'right' }}
        />
      </td>
      <td>
        <input
          className="form-input"
          value={component.unit || 'g'}
          onChange={event => onPatchComponent(index, { unit: event.target.value })}
        />
      </td>
      <td>
        <input
          className="form-input"
          type="number"
          min="0"
          step="any"
          value={component.unitPrice ?? ''}
          onChange={event => onPatchComponent(index, { unitPrice: event.target.value })}
          style={{ textAlign: 'right' }}
        />
      </td>
      <td style={{ textAlign: 'right', fontWeight: 700 }}>
        {subtotal > 0 ? `${formatNumber(Math.round(subtotal))}원` : '—'}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <button
            type="button"
            className="btn sm"
            onClick={() => onMoveComponent(index, -1)}
            title="위로 이동"
            aria-label="위로 이동"
            disabled={isFirst}
            style={{ width: 28, height: 28, padding: 0 }}
          >
            <Icon.arrowUp style={{ width: 13, height: 13 }} />
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={() => onMoveComponent(index, 1)}
            title="아래로 이동"
            aria-label="아래로 이동"
            disabled={isLast}
            style={{ width: 28, height: 28, padding: 0 }}
          >
            <Icon.arrowDown style={{ width: 13, height: 13 }} />
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={() => onRemoveComponent(index)}
            title="구성품 삭제"
            aria-label="구성품 삭제"
            style={{ width: 28, height: 28, padding: 0, color: 'var(--negative)' }}
          >
            <Icon.trash style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function RecipeMasterSummary({ draftKind, draftTotalCost, draftDerived }) {
  return (
    <aside
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <MiniSummary label="전송 대상" value={recipeSyncTargetLabel(draftKind)} />
      <MiniSummary
        label="원가 합계"
        value={`${formatNumber(Math.round(draftTotalCost))}원`}
      />
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>
          알레르기
        </div>
        <ChipList
          items={draftDerived.allergenCodes.map(code => ALLERGEN_NAME_BY_CODE[code] || code)}
          empty="없음"
        />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>
          원산지
        </div>
        <ChipList
          items={draftDerived.origins.map(item => `${item.displayName} ${item.country}`)}
          empty="없음"
        />
      </div>
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>{label}</span>
      {children}
    </label>
  );
}

function MiniSummary({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{value}</div>
    </div>
  );
}

function ChipList({ items, empty }) {
  const safeItems = items.filter(Boolean);
  if (!safeItems.length) {
    return <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{empty}</span>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {safeItems.slice(0, 10).map(item => (
        <span
          key={item}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 999,
            background: 'var(--surface-2)',
            color: 'var(--text-2)',
          }}
        >
          {item}
        </span>
      ))}
      {safeItems.length > 10 && (
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>+{safeItems.length - 10}</span>
      )}
    </div>
  );
}
