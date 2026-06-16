import { FormField } from './RegisterModalPrimitives';

export function RegisterModalBasicFields({ row, form, categoryOptions, setField, onToggleCustom }) {
  return (
    <>
      <FormField label="마스터 재료명" hint="비워두면 제때 제품명 자동 사용">
        <input
          className="form-input"
          value={form.ingredientName}
          onChange={event => setField('ingredientName', event.target.value)}
          placeholder={row.productName}
        />
      </FormField>

      <FormField label="분류">
        <div style={{ display: 'flex', gap: 6 }}>
          {form.customCat ? (
            <input
              className="form-input"
              value={form.category}
              onChange={event => setField('category', event.target.value)}
              placeholder="직접 입력"
              style={{ flex: 1 }}
            />
          ) : (
            <select
              className="form-input"
              value={form.category}
              onChange={event => setField('category', event.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">미분류</option>
              {categoryOptions.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="btn"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={onToggleCustom}
          >
            {form.customCat ? '목록에서 선택' : '직접 입력'}
          </button>
        </div>
      </FormField>
    </>
  );
}
