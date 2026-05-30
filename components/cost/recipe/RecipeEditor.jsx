'use client';
import { useMemo, useRef } from 'react';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { calcMarginRate, MENU_CATEGORIES } from '@/lib/recipe';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { parseMenuCode } from '@/lib/cost/menu-price/code';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { SectionLabel, FieldLabel, thStyle } from '@/components/cost/shared/FormLabels';
import { costRateColor } from '@/lib/cost/rate-color';

export function RecipeEditor({ draft, setDraft, allMeta, menuMasters, menuPricesMap, unitPriceMap, allGroups, isNew, saving, onSave, onDelete, onCancel }) {

  const sizeLabels = useMemo(
    () => draft.sizes.map(s => s.label).filter(Boolean),
    [draft.sizes]
  );

  const defaultGroupIds = useMemo(() => {
    const cat = draft.menuCategory || '';
    return new Set(
      allGroups.filter(g => (g.defaultCategories || []).some(c => cat === c || cat.startsWith(c + '/'))).map(g => g.id)
    );
  }, [allGroups, draft.menuCategory]);

  const activeGroupIds = useMemo(() => {
    if (draft.groupIds === null) return defaultGroupIds;
    return new Set(draft.groupIds);
  }, [draft.groupIds, defaultGroupIds]);

  const initialDraftRef = useRef(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = JSON.stringify(draft);
  }
  const isDirty = JSON.stringify(draft) !== initialDraftRef.current;
  useBeforeUnload(isDirty);

  useKeyboardSave(onSave);

  function toggleGroup(groupId) {
    setDraft(d => {
      const cat = d.menuCategory || '';
      const freshDefaults = new Set(
        allGroups.filter(g => (g.defaultCategories || []).some(c => cat === c || cat.startsWith(c + '/'))).map(g => g.id)
      );
      const current = d.groupIds === null ? freshDefaults : new Set(d.groupIds);
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return { ...d, groupIds: [...next] };
    });
  }

  const groupCostBySizes = useMemo(() => {
    const result = {};
    for (const sl of sizeLabels) result[sl] = 0;
    for (const group of allGroups) {
      if (!activeGroupIds.has(group.id)) continue;
      for (const ing of (group.ingredients || [])) {
        const info = unitPriceMap.get(ing.productCode);
        if (!info?.unitPrice) continue;
        for (const sl of sizeLabels) {
          const qty = parseFloat(ing.quantities?.[sl]) || 0;
          if (qty) result[sl] = (result[sl] || 0) + info.unitPrice * qty;
        }
      }
    }
    return result;
  }, [allGroups, activeGroupIds, sizeLabels, unitPriceMap]);

  function setField(key, val) {
    setDraft(d => ({ ...d, [key]: val }));
  }

  function setSize(idx, key, val) {
    setDraft(d => {
      const sizes = [...d.sizes];
      sizes[idx] = { ...sizes[idx], [key]: val };
      return { ...d, sizes };
    });
  }
  function addSize() {
    setDraft(d => ({ ...d, sizes: [...d.sizes, { label: '', sellingPrice: '' }] }));
  }
  function removeSize(idx) {
    setDraft(d => ({ ...d, sizes: d.sizes.filter((_, i) => i !== idx) }));
  }

  function setIngredientQty(lineIdx, sizeLabel, val) {
    setDraft(d => {
      const ingredients = d.ingredients.map((line, i) => {
        if (i !== lineIdx) return line;
        return { ...line, quantities: { ...line.quantities, [sizeLabel]: val } };
      });
      return { ...d, ingredients };
    });
  }
  function addIngredient(meta) {
    const info = unitPriceMap.get(meta.productCode);
    const quantities = {};
    sizeLabels.forEach(sl => { quantities[sl] = ''; });
    setDraft(d => ({
      ...d,
      ingredients: [...d.ingredients, {
        productCode:    meta.productCode,
        ingredientName: meta.ingredientName || '',
        quantities,
        unitType:       info?.baseUnitType || meta.baseUnitType || 'g',
        note:           '',
      }],
    }));
  }
  function removeIngredient(idx) {
    setDraft(d => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== idx) }));
  }

  const costBySizes = useMemo(() => {
    const result = {};
    for (const sl of sizeLabels) {
      result[sl] = draft.ingredients.reduce((acc, line) => {
        const info = unitPriceMap.get(line.productCode);
        if (!info?.unitPrice) return acc;
        const qty = parseFloat(line.quantities?.[sl]) || 0;
        return acc + (qty ? info.unitPrice * qty : 0);
      }, 0);
    }
    return result;
  }, [draft.ingredients, sizeLabels, unitPriceMap]);

  const totalCostBySizes = useMemo(() => {
    const result = {};
    for (const sl of sizeLabels) {
      result[sl] = (costBySizes[sl] || 0) + (groupCostBySizes[sl] || 0);
    }
    return result;
  }, [costBySizes, groupCostBySizes, sizeLabels]);

  return (
    <div className="card" aria-busy={saving} style={{ padding: '20px 24px' }}>
      {/* 상단 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          {isNew ? '새 메뉴 레시피 등록' : `${draft.menuName} 수정`}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onDelete && (
            <button className="btn" style={{ color: 'var(--negative)' }} onClick={onDelete}>삭제</button>
          )}
          <button className="btn" onClick={onCancel}>취소</button>
          <button className="btn primary" onClick={onSave} disabled={saving}>
            {saving ? '저장 중…' : isNew ? '등록' : '수정'}
          </button>
        </div>
      </div>

      {/* 기본 정보 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 20 }}>
        <div>
          <FieldLabel>메뉴명</FieldLabel>
          <input className="form-input" value={draft.menuName}
            onChange={e => setField('menuName', e.target.value)}
            placeholder="예) 레드핫그릴치킨"/>
        </div>
        <div>
          <FieldLabel>카테고리</FieldLabel>
          <select className="form-input" value={draft.menuCategory}
            onChange={e => setField('menuCategory', e.target.value)}>
            {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FieldLabel>메뉴코드 (메뉴 마스터)</FieldLabel>
          <MenuCodePicker
            menuMasters={menuMasters}
            value={draft.menuCode || ''}
            onChange={(val, meta) => {
              setDraft(d => {
                const next = { ...d, menuCode: val };
                if (meta?.category) next.menuCategory = meta.category;
                if (val) {
                  const found = menuMasters.find(m =>
                    m.menuCode === val || m.menuCode.startsWith(val + '-')
                  );
                  if (found?.menuName) next.menuName = found.menuName;
                }
                const parsedVal = val ? parseMenuCode(val) : null;
                const baseKey = parsedVal
                  ? `${parsedVal.prefix}-${String(parsedVal.base).padStart(3, '0')}`
                  : val;
                if (baseKey && menuPricesMap.has(baseKey)) {
                  const priceBySize = menuPricesMap.get(baseKey);
                  const singleOnly = Object.keys(priceBySize).length === 1 && '단일' in priceBySize;
                  if (singleOnly) {
                    next.sizes = [{ label: '단일', sellingPrice: String(priceBySize['단일']) }];
                  } else {
                    const updatedSizes = d.sizes.map(s => ({
                      ...s,
                      sellingPrice: priceBySize[s.label] != null
                        ? String(priceBySize[s.label])
                        : s.sellingPrice,
                    }));
                    const existingLabels = new Set(d.sizes.map(s => s.label).filter(Boolean));
                    const newSizes = Object.entries(priceBySize)
                      .filter(([size]) => size !== '단일' && !existingLabels.has(size))
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([size, price]) => ({ label: size, sellingPrice: String(price) }));
                    next.sizes = [...updatedSizes, ...newSizes];
                  }
                }
                return next;
              });
            }}
            dedup={true}
          />
        </div>
      </div>

      {/* 사이즈 & 판매가 */}
      <SectionLabel>사이즈 & 판매가</SectionLabel>
      <div style={{ marginBottom: 20 }}>
        {draft.sizes.map((s, i) => {
          const cost = s.label ? (totalCostBySizes[s.label] || 0) : 0;
          const mr   = calcMarginRate(cost, s.sellingPrice ? Number(s.sellingPrice) : null);
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input className="form-input" value={s.label}
                onChange={e => setSize(i, 'label', e.target.value)}
                placeholder="L" style={{ width: 60 }}/>
              <input className="form-input" type="number" min="0" value={s.sellingPrice}
                onChange={e => setSize(i, 'sellingPrice', e.target.value)}
                placeholder="판매가" style={{ flex: 1 }}/>
              <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>원</span>
              {cost > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0, minWidth: 70 }}>
                  원가 {formatNumber(Math.round(cost))}원
                </span>
              )}
              {mr != null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: costRateColor(mr), flexShrink: 0, minWidth: 42 }}>
                  {mr.toFixed(1)}%
                </span>
              )}
              {draft.sizes.length > 1 && (
                <button className="btn" style={{ padding: '3px 6px', flexShrink: 0 }} onClick={() => removeSize(i)}
                  aria-label={`${s.label || i + 1}번 사이즈 삭제`}>
                  <Icon.close style={{ width: 12, height: 12 }}/>
                </button>
              )}
            </div>
          );
        })}
        <button className="btn" style={{ fontSize: 12 }} onClick={addSize}>
          <Icon.plus style={{ width: 12, height: 12 }}/> 사이즈 추가
        </button>
      </div>

      {/* 식자재 레시피 */}
      <SectionLabel>식자재 레시피</SectionLabel>

      {draft.ingredients.length > 0 && (
        <div style={{ marginBottom: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--divider)' }}>
                <th style={thStyle}>식자재명</th>
                <th style={{ ...thStyle, width: 80, textAlign: 'right' }}>단가/단위</th>
                {sizeLabels.map(sl => (
                  <th key={sl} style={{ ...thStyle, width: 100 }} colSpan={2}>
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 700,
                      background: 'rgba(56,189,248,.15)', color: 'var(--accent, #38bdf8)', marginRight: 4 }}>
                      {sl}
                    </span>
                    사용량 / 소계
                  </th>
                ))}
                <th style={{ ...thStyle, width: 40 }}>단위</th>
                <th style={{ ...thStyle, width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {draft.ingredients.map((line, i) => {
                const info = unitPriceMap.get(line.productCode);
                const hasPrice = info?.unitPrice != null;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--divider)' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ fontWeight: 500 }}>{line.ingredientName}</div>
                      {!hasPrice && (
                        <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 1 }}>
                          ⚠ 단가 미등록
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-3)', fontSize: 12 }}>
                      {hasPrice
                        ? `${info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원`
                        : '—'}
                    </td>
                    {sizeLabels.map(sl => {
                      const qty = line.quantities?.[sl] ?? '';
                      const sub = hasPrice && parseFloat(qty) > 0
                        ? Math.round(info.unitPrice * parseFloat(qty) * 10) / 10
                        : null;
                      return [
                        <td key={sl + '_q'} style={{ padding: '4px 4px', width: 70 }}>
                          <input className="form-input" type="number" min="0" value={qty}
                            onChange={e => setIngredientQty(i, sl, e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: '3px 5px', textAlign: 'right' }}/>
                        </td>,
                        <td key={sl + '_s'} style={{ padding: '4px 6px', textAlign: 'right',
                          fontSize: 12, color: sub != null ? 'var(--text-1)' : 'var(--text-4)',
                          fontWeight: sub != null ? 600 : undefined, width: 60 }}>
                          {sub != null ? `${formatNumber(sub)}원` : '—'}
                        </td>,
                      ];
                    })}
                    <td style={{ padding: '6px 4px', fontSize: 12, color: 'var(--text-3)' }}>
                      {line.unitType}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                      <button onClick={() => removeIngredient(i)}
                        aria-label={`${line.ingredientName} 식자재 삭제`}
                        style={{ border: 0, background: 'transparent', cursor: 'pointer',
                          color: 'var(--text-4)', padding: '2px' }}>
                        <Icon.close style={{ width: 11, height: 11 }}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {sizeLabels.length > 0 && (
              <tfoot>
                {activeGroupIds.size > 0 && (
                  <tr style={{ borderTop: '1px solid var(--divider)', background: 'var(--surface-2)' }}>
                    <td style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-3)' }}>레시피 소계</td>
                    <td/>
                    {sizeLabels.map(sl => {
                      const sub = costBySizes[sl] || 0;
                      return [
                        <td key={sl + '_qt'}/>,
                        <td key={sl + '_st'} style={{ padding: '4px 6px', textAlign: 'right', fontSize: 11, color: 'var(--text-3)' }}>
                          {sub > 0 ? `${formatNumber(Math.round(sub))}원` : '—'}
                        </td>,
                      ];
                    })}
                    <td/><td/>
                  </tr>
                )}
                {activeGroupIds.size > 0 && (
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-3)' }}>
                      공통묶음 소계 <span style={{ color: 'var(--text-4)' }}>({activeGroupIds.size}개)</span>
                    </td>
                    <td/>
                    {sizeLabels.map(sl => {
                      const sub = groupCostBySizes[sl] || 0;
                      return [
                        <td key={sl + '_qt'}/>,
                        <td key={sl + '_st'} style={{ padding: '4px 6px', textAlign: 'right', fontSize: 11, color: 'var(--text-3)' }}>
                          {sub > 0 ? `${formatNumber(Math.round(sub))}원` : '—'}
                        </td>,
                      ];
                    })}
                    <td/><td/>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid var(--divider)', background: 'var(--surface-2)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>합계</td>
                  <td/>
                  {sizeLabels.map(sl => {
                    const total = totalCostBySizes[sl] || 0;
                    return [
                      <td key={sl + '_qt'}/>,
                      <td key={sl + '_st'} style={{ padding: '6px 6px', textAlign: 'right',
                        fontWeight: 700, fontSize: 13, color: 'var(--accent, #38bdf8)' }}>
                        {total > 0 ? `${formatNumber(Math.round(total))}원` : '—'}
                      </td>,
                    ];
                  })}
                  <td/>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 공통묶음 */}
      {allGroups.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--divider)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              공통묶음
            </div>
            {draft.groupIds !== null && (
              <button className="btn sm ghost" style={{ fontSize: 11 }}
                onClick={() => setDraft(d => ({ ...d, groupIds: null }))}>
                기본값으로 초기화
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {allGroups.map(g => {
              const on = activeGroupIds.has(g.id);
              const isDefault = defaultGroupIds.has(g.id);
              return (
                <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                  background: on ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}` }}>
                  <input type="checkbox" checked={on} onChange={() => toggleGroup(g.id)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: on ? 'var(--accent-text)' : 'var(--text-1)' }}>
                      {g.name}
                    </span>
                    {isDefault && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-4)',
                        background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>
                        기본
                      </span>
                    )}
                    {g.description && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-3)' }}>{g.description}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {sizeLabels.map(sl => {
                      if (!on) return null;
                      const singleGroupCost = (() => {
                        let c = 0;
                        for (const ing of (g.ingredients || [])) {
                          const info = unitPriceMap.get(ing.productCode);
                          if (!info?.unitPrice) continue;
                          const qty = parseFloat(ing.quantities?.[sl]) || 0;
                          if (qty) c += info.unitPrice * qty;
                        }
                        return c;
                      })();
                      return singleGroupCost > 0 ? (
                        <span key={sl} style={{ fontSize: 11, color: 'var(--accent-text)',
                          background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 4 }}>
                          {sl} {formatNumber(Math.round(singleGroupCost))}원
                        </span>
                      ) : null;
                    })}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <IngredientSearch
        allMeta={allMeta}
        unitPriceMap={unitPriceMap}
        onSelect={addIngredient}
        alreadyAdded={draft.ingredients.map(i => i.productCode)}
        style={{ marginTop: 4 }}
      />

      {/* 비고 */}
      <div style={{ marginTop: 14 }}>
        <FieldLabel>비고</FieldLabel>
        <textarea className="form-input" value={draft.note}
          onChange={e => setField('note', e.target.value)}
          rows={2} placeholder="메모" style={{ resize: 'vertical' }}/>
      </div>
    </div>
  );
}
