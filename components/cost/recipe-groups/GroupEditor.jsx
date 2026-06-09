'use client';
import { useMemo } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { MENU_CATEGORIES } from '@/lib/recipe';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { SectionLabel, FieldLabel, thStyle } from '@/components/cost/shared/FormLabels';

const ALL_CATS = [...new Set([...MENU_CATEGORIES, '기타'])];

export function GroupEditor({ draft, setDraft, allMeta, unitPriceMap, isNew, saving, onSave, onDelete, onCancel }) {
  const sizeLabels = useMemo(() => draft.sizes.filter(Boolean), [draft.sizes]);

  function setField(key, val) { setDraft(d => ({ ...d, [key]: val })); }

  function setSize(idx, val) {
    setDraft(d => { const s = [...d.sizes]; s[idx] = val; return { ...d, sizes: s }; });
  }
  function addSize() { setDraft(d => ({ ...d, sizes: [...d.sizes, ''] })); }
  function removeSize(idx) {
    setDraft(d => ({ ...d, sizes: d.sizes.filter((_, i) => i !== idx) }));
  }

  function toggleCategory(cat) {
    setDraft(d => {
      const cats = d.defaultCategories || [];
      return {
        ...d,
        defaultCategories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat],
      };
    });
  }

  function setIngredientQty(lineIdx, sizeLabel, val) {
    setDraft(d => ({
      ...d,
      ingredients: d.ingredients.map((line, i) =>
        i !== lineIdx ? line : { ...line, quantities: { ...line.quantities, [sizeLabel]: val } }
      ),
    }));
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
        unitType: info?.baseUnitType || meta.baseUnitType || 'g',
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

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          {isNew ? '새 공통묶음 등록' : `${draft.name} 수정`}
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
          <FieldLabel>묶음 이름 *</FieldLabel>
          <input className="form-input" value={draft.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="예) 피자L 공통, 피자LR 공통"/>
        </div>
        <div>
          <FieldLabel>설명 (선택)</FieldLabel>
          <input className="form-input" value={draft.description || ''}
            onChange={e => setField('description', e.target.value)}
            placeholder="묶음 설명"/>
        </div>
      </div>

      {/* 사이즈 정의 */}
      <SectionLabel>사이즈 레이블</SectionLabel>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {draft.sizes.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input className="form-input" value={s}
                onChange={e => setSize(i, e.target.value)}
                placeholder="L" style={{ width: 60 }}/>
              {draft.sizes.length > 1 && (
                <button className="btn" style={{ padding: '3px 6px' }} onClick={() => removeSize(i)}>
                  <Icon.close style={{ width: 11, height: 11 }}/>
                </button>
              )}
            </div>
          ))}
          <button className="btn" style={{ fontSize: 12 }} onClick={addSize}>
            <Icon.plus style={{ width: 12, height: 12 }}/> 추가
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
          레시피의 사이즈 레이블과 일치하면 해당 사이즈 원가에 자동 반영됩니다
        </div>
      </div>

      {/* 기본 적용 카테고리 */}
      <SectionLabel>기본 적용 카테고리</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {ALL_CATS.map(cat => {
          const on = (draft.defaultCategories || []).includes(cat);
          return (
            <button key={cat} type="button" onClick={() => toggleCategory(cat)}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                background: on ? 'var(--accent-soft)' : 'var(--surface)',
                color: on ? 'var(--accent-text)' : 'var(--text-2)',
              }}>
              {cat}
            </button>
          );
        })}
      </div>

      {/* 식자재 테이블 */}
      <SectionLabel>식자재 <span style={{ fontSize:11, fontWeight:400, color:'var(--text-4)' }}>(사용량에 −(마이너스) 입력 시 차감)</span></SectionLabel>
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
                      background: 'rgba(56,189,248,.15)', color: 'var(--accent)', marginRight: 4 }}>
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
                      {!hasPrice && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 1 }}>⚠ 단가 미등록</div>}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-3)', fontSize: 12 }}>
                      {hasPrice ? `${info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원` : '—'}
                    </td>
                    {sizeLabels.map(sl => {
                      const qty = line.quantities?.[sl] ?? '';
                      const qn  = parseFloat(qty);
                      const sub = hasPrice && Number.isFinite(qn) && qn !== 0
                        ? Math.round(info.unitPrice * qn * 10) / 10
                        : null;
                      return [
                        <td key={sl + '_q'} style={{ padding: '4px 4px', width: 70 }}>
                          <input className="form-input" type="number" min="0" value={qty}
                            onChange={e => setIngredientQty(i, sl, e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: '3px 5px', textAlign: 'right' }}/>
                        </td>,
                        <td key={sl + '_s'} style={{ padding: '4px 6px', textAlign: 'right',
                          fontSize: 12, color: sub == null ? 'var(--text-4)' : sub < 0 ? 'var(--negative)' : 'var(--text-1)',
                          fontWeight: sub != null ? 600 : undefined, width: 60 }}>
                          {sub != null ? `${formatNumber(sub)}원` : '—'}
                        </td>,
                      ];
                    })}
                    <td style={{ padding: '6px 4px', fontSize: 12, color: 'var(--text-3)' }}>{line.unitType}</td>
                    <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                      <button onClick={() => removeIngredient(i)}
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
                <tr style={{ borderTop: '2px solid var(--divider)', background: 'var(--surface-2)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>합계</td>
                  <td/>
                  {sizeLabels.map(sl => {
                    const total = costBySizes[sl] || 0;
                    return [
                      <td key={sl + '_qt'}/>,
                      <td key={sl + '_st'} style={{ padding: '6px 6px', textAlign: 'right',
                        fontWeight: 700, fontSize: 13, color: total < 0 ? 'var(--negative)' : 'var(--accent)' }}>
                        {total !== 0 ? `${formatNumber(Math.round(total))}원` : '—'}
                      </td>,
                    ];
                  })}
                  <td/><td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <IngredientSearch
        allMeta={allMeta}
        unitPriceMap={unitPriceMap}
        onSelect={addIngredient}
        alreadyAdded={draft.ingredients.map(i => i.productCode)}
      />
    </div>
  );
}
