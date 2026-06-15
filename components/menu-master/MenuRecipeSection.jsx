'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { initDB } from '@/lib/db';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { getAllIngredients } from '@/lib/ingredient';
import { formatNumber, formatPercent, formatUnitPrice } from '@/lib/format';
import { COST_BASE_UNITS, normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { loadLatestUnitPriceMap, summarizeMenuRecipe } from '@/lib/menu-master/recipe-summary';
import { getMenuRecipeForMenu, upsertMenuRecipeForMenu } from '@/lib/menu-recipes';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';

let _rowKey = 0;
function newRow() {
  return {
    _key: ++_rowKey,
    ingredientName: '',
    productCode: '',
    quantity: '',
    unit: 'g',
    unitPrice: null,
  };
}

function productCodeOf(component) {
  return String(component?.productCode || '').trim();
}

function unitPriceInfoFor(component, unitPriceMap) {
  const productCode = productCodeOf(component);
  return productCode ? unitPriceMap.get(productCode) || null : null;
}

function hydrateComponent(component, unitPriceMap) {
  const info = unitPriceInfoFor(component, unitPriceMap);
  return {
    ...component,
    _key: ++_rowKey,
    unit: normalizeCostBaseUnit(info?.baseUnitType || component?.unit),
    unitPrice: info?.unitPrice ?? component?.unitPrice ?? null,
  };
}

function buildSaveComponent(component, unitPriceMap) {
  const productCode = productCodeOf(component);
  const info = productCode ? unitPriceMap.get(productCode) : null;
  const quantity = component.quantity !== '' ? Number(component.quantity) : null;
  return {
    ingredientName: component.ingredientName || '',
    productCode: productCode || null,
    quantity,
    unit: normalizeCostBaseUnit(info?.baseUnitType || component.unit),
    unitPrice:
      info?.unitPrice ?? (component.unitPrice != null ? Number(component.unitPrice) : null),
  };
}

export function MenuRecipeSection({ menuCode, menuName, category, size, sellingPrice, onSaved }) {
  const [components, setComponents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allIngs, setAllIngs] = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [searchIdx, setSearchIdx] = useState(null); // index of row being searched
  const [searchQ, setSearchQ] = useState('');

  const recipeKind = recipeStoreKindForCategory(category);
  const supported = Boolean(recipeKind && menuCode);

  useEffect(() => {
    setLoaded(false);
    setComponents([]);
    setAllIngs([]);
    setUnitPriceMap(new Map());
    if (!supported) return;
    let ignore = false;
    initDB().then(async () => {
      const [existing, ings, latestUnitPriceMap] = await Promise.all([
        getMenuRecipeForMenu({ menuCode, menuName, category, size }),
        getAllIngredients(),
        loadLatestUnitPriceMap(),
      ]);
      if (ignore) return;
      setComponents(
        existing?.components?.length
          ? existing.components.map(c => hydrateComponent(c, latestUnitPriceMap))
          : []
      );
      setAllIngs(ings);
      setUnitPriceMap(latestUnitPriceMap);
      setLoaded(true);
    });
    return () => {
      ignore = true;
    };
    // api functions are stable module-level imports, category/menuCode cover the relevant deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuCode, category]);

  const suggestions = useMemo(() => {
    if (!searchQ.trim()) return [];
    const q = searchQ.toLowerCase().replace(/\s/g, '');
    return allIngs
      .filter(i => !i.discontinued && !i.excluded)
      .filter(
        i =>
          (i.ingredientName || '').toLowerCase().replace(/\s/g, '').includes(q) ||
          (i.productCode || '').toLowerCase().replace(/\s/g, '').includes(q)
      )
      .slice(0, 8);
  }, [searchQ, allIngs]);

  const updateRow = useCallback((idx, field, val) => {
    setComponents(prev => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  }, []);

  const removeRow = useCallback(idx => {
    setComponents(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const addRow = useCallback(() => {
    setComponents(prev => [...prev, newRow()]);
  }, []);

  const pickSuggestion = useCallback(
    (idx, ing) => {
      setComponents(prev =>
        prev.map((c, i) =>
          i === idx
            ? {
                ...c,
                ingredientName: ing.ingredientName || '',
                productCode: ing.productCode || '',
                unit: normalizeCostBaseUnit(
                  unitPriceMap.get(ing.productCode)?.baseUnitType || ing.baseUnitType
                ),
                unitPrice: unitPriceMap.get(ing.productCode)?.unitPrice ?? null,
              }
            : c
        )
      );
      setSearchIdx(null);
      setSearchQ('');
    },
    [unitPriceMap]
  );

  const recipeSummary = useMemo(
    () =>
      summarizeMenuRecipe(
        { menuCode, category, price: sellingPrice },
        { components },
        unitPriceMap
      ),
    [category, components, menuCode, sellingPrice, unitPriceMap]
  );

  const handleSave = useCallback(async () => {
    if (!supported) return;
    setSaving(true);
    try {
      await upsertMenuRecipeForMenu({
        menuCode,
        menuName: menuName || '',
        category,
        kind: recipeKind,
        size: size || '단일',
        components: components.map(c => buildSaveComponent(c, unitPriceMap)),
      });
      await onSaved?.();
      showToast('레시피 저장됨', 'ok');
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
    } finally {
      setSaving(false);
    }
  }, [supported, menuCode, menuName, category, recipeKind, size, components, unitPriceMap, onSaved]);

  if (!supported) return null;

  if (!loaded) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>레시피 로딩 중…</div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-3)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>레시피 구성품</span>
        <button
          type="button"
          className="btn sm"
          onClick={handleSave}
          disabled={saving}
          style={{ fontSize: 11 }}
        >
          {saving ? '저장 중…' : '레시피 저장'}
        </button>
      </div>

      {components.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            fontSize: 11,
            color: 'var(--text-3)',
            margin: '0 0 8px',
          }}
        >
          <span>
            예상 원가{' '}
            <b style={{ color: 'var(--text-1)' }}>{formatNumber(recipeSummary.totalCost)}원</b>
          </span>
          {recipeSummary.costRate != null && (
            <span>원가율 {formatPercent(recipeSummary.costRate)}</span>
          )}
          {recipeSummary.missingQuantityCount > 0 && (
            <span style={{ color: 'var(--warn)' }}>
              수량 확인 {recipeSummary.missingQuantityCount}
            </span>
          )}
          {recipeSummary.missingPriceCount > 0 && (
            <span style={{ color: 'var(--warn)' }}>
              단가 확인 {recipeSummary.missingPriceCount}
            </span>
          )}
        </div>
      )}

      {components.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-4)',
            textAlign: 'center',
            padding: '10px 0',
          }}
        >
          구성품이 없습니다
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--divider)' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '4px 4px',
                  fontWeight: 600,
                  color: 'var(--text-3)',
                }}
              >
                식자재명
              </th>
              <th
                style={{
                  width: 70,
                  textAlign: 'right',
                  padding: '4px 4px',
                  fontWeight: 600,
                  color: 'var(--text-3)',
                }}
              >
                수량
              </th>
              <th
                style={{
                  width: 40,
                  textAlign: 'right',
                  padding: '4px 4px',
                  fontWeight: 600,
                  color: 'var(--text-3)',
                }}
              >
                단위
              </th>
              <th
                style={{
                  width: 84,
                  textAlign: 'right',
                  padding: '4px 4px',
                  fontWeight: 600,
                  color: 'var(--text-3)',
                }}
              >
                단가
              </th>
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {components.map((c, idx) => (
              <tr key={c._key} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '4px 4px', position: 'relative' }}>
                  <input
                    className="form-input"
                    style={{ width: '100%', fontSize: 12, padding: '4px 6px' }}
                    value={searchIdx === idx ? searchQ : c.ingredientName || ''}
                    onChange={e => {
                      setSearchIdx(idx);
                      setSearchQ(e.target.value);
                      updateRow(idx, 'ingredientName', e.target.value);
                    }}
                    onFocus={() => {
                      setSearchIdx(idx);
                      setSearchQ(c.ingredientName || '');
                    }}
                    onBlur={() => setTimeout(() => setSearchIdx(null), 150)}
                    placeholder="식자재명"
                  />
                  {searchIdx === idx && suggestions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        zIndex: 50,
                        maxHeight: 160,
                        overflowY: 'auto',
                      }}
                    >
                      {suggestions.map(ing => (
                        <SuggestionItem
                          key={ing.id || ing.productCode}
                          ingredient={ing}
                          unitPriceMap={unitPriceMap}
                          onPick={() => pickSuggestion(idx, ing)}
                        />
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ padding: '4px 4px' }}>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    style={{ width: '100%', fontSize: 12, padding: '4px 6px', textAlign: 'right' }}
                    value={c.quantity ?? ''}
                    onChange={e => updateRow(idx, 'quantity', e.target.value)}
                    placeholder="0"
                  />
                </td>
                <td style={{ padding: '4px 4px' }}>
                  <select
                    className="form-input"
                    style={{ width: '100%', fontSize: 12, padding: '4px 4px' }}
                    value={normalizeCostBaseUnit(c.unit)}
                    onChange={e => updateRow(idx, 'unit', normalizeCostBaseUnit(e.target.value))}
                  >
                    {COST_BASE_UNITS.map(unit => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '4px 4px', textAlign: 'right', fontSize: 11 }}>
                  <span style={{ color: c.unitPrice != null ? 'var(--text-2)' : 'var(--warn)' }}>
                    {formatUnitPrice(c.unitPrice, normalizeCostBaseUnit(c.unit)) || '단가 없음'}
                  </span>
                </td>
                <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    title="구성품 삭제"
                    style={{
                      border: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--text-4)',
                      padding: 2,
                    }}
                  >
                    <Icon.close style={{ width: 10, height: 10 }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        type="button"
        className="btn sm"
        style={{ marginTop: 8, width: '100%', fontSize: 12 }}
        onClick={addRow}
      >
        + 구성품 추가
      </button>
    </div>
  );
}

function SuggestionItem({ ingredient, unitPriceMap, onPick }) {
  const info = ingredient.productCode ? unitPriceMap.get(ingredient.productCode) : null;
  return (
    <div
      onMouseDown={onPick}
      style={{
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      {ingredient.ingredientName}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
        {ingredient.productCode && (
          <span style={{ color: 'var(--text-4)', fontSize: 11 }}>{ingredient.productCode}</span>
        )}
        {info?.unitPrice != null && (
          <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
            {formatUnitPrice(info.unitPrice, info.baseUnitType)}
          </span>
        )}
      </div>
    </div>
  );
}
