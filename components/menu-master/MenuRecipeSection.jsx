'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { initDB } from '@/lib/db';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { getAllIngredients } from '@/lib/ingredient';
import {
  isPersonalPizzaCategory,
  isSetCategory,
  isSideCategory,
  isBeverageCategory,
  isPizzaCategory,
} from '@/lib/menu-master/category-policy';
import { getAllPizzaRecipes, upsertPizzaRecipe } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes, upsertPersonalRecipe } from '@/lib/cost/personal-detail';
import { getAllSideRecipes, upsertSideRecipe } from '@/lib/cost/side-detail';
import { getAllSetRecipes, upsertSetRecipe } from '@/lib/cost/set-detail';

function storeApiFor(category) {
  if (isPersonalPizzaCategory(category)) return { getAll: getAllPersonalRecipes, upsert: upsertPersonalRecipe };
  if (isSetCategory(category)) return { getAll: getAllSetRecipes, upsert: upsertSetRecipe };
  if (isSideCategory(category) || isBeverageCategory(category)) return { getAll: getAllSideRecipes, upsert: upsertSideRecipe };
  if (isPizzaCategory(category)) return { getAll: getAllPizzaRecipes, upsert: upsertPizzaRecipe };
  return null;
}

let _rowKey = 0;
function newRow() {
  return { _key: ++_rowKey, ingredientName: '', productCode: '', quantity: '', unit: 'g' };
}

export function MenuRecipeSection({ menuCode, menuName, category, size }) {
  const [components, setComponents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allIngs, setAllIngs] = useState([]);
  const [searchIdx, setSearchIdx] = useState(null); // index of row being searched
  const [searchQ, setSearchQ] = useState('');

  const api = storeApiFor(category);
  const supported = Boolean(api && menuCode);

  useEffect(() => {
    if (!supported) return;
    let ignore = false;
    initDB().then(async () => {
      const [all, ings] = await Promise.all([api.getAll(), getAllIngredients()]);
      if (ignore) return;
      const existing = all.find(r => r.menuCode === menuCode);
      setComponents(
        existing?.components?.length
          ? existing.components.map(c => ({ ...c, _key: ++_rowKey }))
          : []
      );
      setAllIngs(ings);
      setLoaded(true);
    });
    return () => { ignore = true; };
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
                unit: ing.baseUnitType || 'g',
              }
            : c
        )
      );
      setSearchIdx(null);
      setSearchQ('');
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!api) return;
    setSaving(true);
    try {
      await api.upsert({
        menuCode,
        menuName: menuName || '',
        size: size || '단일',
        components: components.map(c => ({
          ingredientName: c.ingredientName || '',
          productCode: c.productCode || null,
          quantity: c.quantity !== '' ? Number(c.quantity) : null,
          unit: c.unit || 'g',
          unitPrice: null,
        })),
      });
      showToast('레시피 저장됨', 'ok');
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
    } finally {
      setSaving(false);
    }
  }, [api, menuCode, menuName, size, components]);

  if (!supported) return null;

  if (!loaded) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>
        레시피 로딩 중…
      </div>
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
              <th style={{ textAlign: 'left', padding: '4px 4px', fontWeight: 600, color: 'var(--text-3)' }}>식자재명</th>
              <th style={{ width: 70, textAlign: 'right', padding: '4px 4px', fontWeight: 600, color: 'var(--text-3)' }}>수량</th>
              <th style={{ width: 40, textAlign: 'right', padding: '4px 4px', fontWeight: 600, color: 'var(--text-3)' }}>단위</th>
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
                    value={searchIdx === idx ? searchQ : (c.ingredientName || '')}
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
                        <div
                          key={ing.id || ing.productCode}
                          onMouseDown={() => pickSuggestion(idx, ing)}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          {ing.ingredientName}
                          {ing.productCode && (
                            <span style={{ color: 'var(--text-4)', marginLeft: 6, fontSize: 11 }}>
                              {ing.productCode}
                            </span>
                          )}
                        </div>
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
                  <input
                    className="form-input"
                    style={{ width: '100%', fontSize: 12, padding: '4px 6px' }}
                    value={c.unit || 'g'}
                    onChange={e => updateRow(idx, 'unit', e.target.value)}
                    placeholder="g"
                  />
                </td>
                <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
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
