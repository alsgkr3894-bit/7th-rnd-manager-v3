'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { deleteTopping, NUTRITION_FIELDS, upsertTopping } from '@/lib/nutrition/values/store';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

const noop = () => {};
const EMPTY_MAP = new Map();
const ALLERGEN_NAME_BY_CODE = Object.fromEntries(
  ALLERGEN_SEED.map(item => [asDisplayText(item.allergenCode), asDisplayText(item.allergenName)])
);

function normalizeIngredientName(row) {
  return asDisplayText(
    row?.ingredientName || row?.displayName || row?.productName || row?.productCode
  );
}

function ingredientNameKey(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s+/g, '');
}

function formatNutritionValue(value, suffix = '') {
  const text = asDisplayText(value);
  if (!text) return '미입력';
  const num = Number(text);
  if (!Number.isFinite(num)) return text;
  return `${Math.round(num).toLocaleString('ko-KR')}${suffix}`;
}

export function TabToppings({ toppings, ingredients, onRefresh }) {
  const safeToppings = useMemo(() => asObjectArray(toppings), [toppings]);
  const safeIngredients = useMemo(
    () =>
      asObjectArray(ingredients).map(row => ({
        ...row,
        ingredientName: normalizeIngredientName(row),
      })),
    [ingredients]
  );
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    toppingCode: '',
    toppingName: '',
    productCode: '',
    ingredientName: '',
  });
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const ingredientByCode = useMemo(() => {
    const map = new Map();
    for (const ing of safeIngredients) {
      const productCode = asDisplayText(ing.productCode);
      if (productCode) map.set(productCode, ing);
    }
    return map;
  }, [safeIngredients]);

  const ingredientByName = useMemo(() => {
    const map = new Map();
    for (const ing of safeIngredients) {
      const key = ingredientNameKey(ing.ingredientName);
      if (key) map.set(key, ing);
    }
    return map;
  }, [safeIngredients]);

  const linkedIngredient = topping => {
    const productCode = asDisplayText(topping?.productCode);
    if (productCode && ingredientByCode.has(productCode)) return ingredientByCode.get(productCode);
    const nameKey = ingredientNameKey(topping?.ingredientName || topping?.toppingName);
    return nameKey ? ingredientByName.get(nameKey) : null;
  };

  const allergenText = topping => {
    const ingredient = linkedIngredient(topping);
    const names = asStringArray(ingredient?.allergens)
      .map(code => ALLERGEN_NAME_BY_CODE[code] || code)
      .filter(Boolean);
    return names.length ? names.join(', ') : '없음';
  };

  const openAdd = () => {
    setForm({ toppingCode: '', toppingName: '', productCode: '', ingredientName: '' });
    setValues({});
    setModal('add');
  };

  const openEdit = topping => {
    setForm({
      toppingCode: asDisplayText(topping.toppingCode),
      toppingName: asDisplayText(topping.toppingName),
      productCode: asDisplayText(topping.productCode),
      ingredientName: asDisplayText(topping.ingredientName),
    });
    setValues(
      NUTRITION_FIELDS.reduce((acc, { key }) => ({ ...acc, [key]: topping[key] ?? '' }), {})
    );
    setModal(topping);
  };

  const selectIngredient = ingredient => {
    const ingredientName = normalizeIngredientName(ingredient);
    setForm(prev => ({
      ...prev,
      productCode: asDisplayText(ingredient.productCode),
      ingredientName,
      toppingName: prev.toppingName || ingredientName,
    }));
  };

  const clearIngredient = () => {
    setForm(prev => ({ ...prev, productCode: '', ingredientName: '' }));
  };

  const save = async () => {
    const toppingName = asDisplayText(form.toppingName).trim();
    if (!toppingName) {
      showToast('추가토핑명을 입력해주세요', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = modal !== 'add' ? modal.id : undefined;
      const toppingCode = asDisplayText(form.toppingCode).trim() || `TOP-${Date.now()}`;
      await upsertTopping({
        ...(id ? { id } : {}),
        ...form,
        toppingName,
        toppingCode,
        basis: 'serving',
        ...values,
      });
      showToast('추가토핑 저장 완료', 'ok');
      setModal(null);
      await refresh();
    } catch (err) {
      showToast(`저장 실패: ${err?.message || err}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async topping => {
    const name = asDisplayText(topping.toppingName, '추가토핑');
    if (!confirm(`'${name}' 추가토핑을 삭제할까요?`)) return;
    await deleteTopping(topping.id);
    showToast('삭제 완료', 'ok');
    refresh();
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>추가토핑 영양성분</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            식자재코드를 연결하면 식자재 관리의 알레르기 정보가 표출력에 함께 반영됩니다.
          </div>
        </div>
        <button className="btn sm primary" type="button" onClick={openAdd}>
          <Icon.plus style={{ width: 13, height: 13 }} />
          추가토핑 추가
        </button>
      </div>

      {safeToppings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Icon.box style={{ width: 28, height: 28 }} />
          </div>
          <div className="empty-title">등록된 추가토핑이 없어요</div>
          <div className="empty-sub">추가토핑명, 식자재코드, 열량 정보를 등록하세요.</div>
        </div>
      ) : (
        <div className="card table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>추가토핑명</th>
                  <th style={{ width: 130 }}>식자재코드</th>
                  <th>연결 식자재</th>
                  <th style={{ width: 100 }}>중량</th>
                  <th style={{ width: 110 }}>열량</th>
                  <th>알레르기</th>
                  <th style={{ width: 90 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {safeToppings.map((topping, index) => {
                  const linked = linkedIngredient(topping);
                  const toppingName = asDisplayText(topping.toppingName, `추가토핑 ${index + 1}`);
                  const productCode = asDisplayText(topping.productCode);
                  const ingredientName = asDisplayText(
                    linked?.ingredientName || topping.ingredientName
                  );
                  return (
                    <tr key={topping.id || topping.toppingCode || toppingName}>
                      <td style={{ fontWeight: 800 }}>{toppingName}</td>
                      <td className="mono muted">{productCode || '미연결'}</td>
                      <td>
                        {ingredientName ? (
                          <span style={{ fontWeight: 700 }}>{ingredientName}</span>
                        ) : (
                          <span style={{ color: 'var(--text-4)' }}>식자재 미연결</span>
                        )}
                      </td>
                      <td>{formatNutritionValue(topping.weight, 'g')}</td>
                      <td style={{ fontWeight: 800, color: 'var(--accent)' }}>
                        {formatNutritionValue(topping.kcal, 'kcal')}
                      </td>
                      <td style={{ fontSize: 12 }}>{allergenText(topping)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn sm ghost"
                            type="button"
                            onClick={() => openEdit(topping)}
                          >
                            <Icon.edit style={{ width: 13, height: 13 }} />
                          </button>
                          <button
                            className="btn sm ghost"
                            type="button"
                            onClick={() => remove(topping)}
                            style={{ color: 'var(--danger)' }}
                          >
                            <Icon.trash style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ModalFrame
          title={modal === 'add' ? '추가토핑 추가' : '추가토핑 편집'}
          onClose={() => setModal(null)}
          width="min(720px, 96vw)"
          zIndex={300}
          padding="24px 28px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-row two" style={{ marginTop: 0 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  추가토핑명 *
                </label>
                <input
                  className="input"
                  value={form.toppingName}
                  onChange={e => setForm(prev => ({ ...prev, toppingName: e.target.value }))}
                  placeholder="예: 페퍼로니 추가"
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  추가토핑 코드
                </label>
                <input
                  className="input"
                  value={form.toppingCode}
                  onChange={e => setForm(prev => ({ ...prev, toppingCode: e.target.value }))}
                  placeholder="미입력 시 자동 생성"
                />
              </div>
            </div>

            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}
              >
                식자재코드 연결
              </label>
              {form.productCode || form.ingredientName ? (
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
                  <button className="btn sm ghost" type="button" onClick={clearIngredient}>
                    연결 해제
                  </button>
                </div>
              ) : (
                <IngredientSearch
                  allMeta={safeIngredients}
                  unitPriceMap={EMPTY_MAP}
                  alreadyAdded={[]}
                  onSelect={selectIngredient}
                  style={{ marginTop: 0 }}
                />
              )}
            </div>

            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}
              >
                영양성분 (1회 제공량 기준)
              </label>
              <NutritionGrid
                values={values}
                onChange={(key, value) => setValues(prev => ({ ...prev, [key]: value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn" type="button" onClick={() => setModal(null)}>
              취소
            </button>
            <button className="btn primary" type="button" onClick={save} disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </ModalFrame>
      )}
    </div>
  );
}
