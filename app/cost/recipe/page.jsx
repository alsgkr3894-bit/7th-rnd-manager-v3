'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import {
  getAllRecipes, saveRecipe, deleteRecipe,
  buildUnitPriceMap, calcRecipeCost, calcCostBySizes, calcMarginRate,
  MENU_CATEGORIES,
} from '@/lib/recipe';

const MARGIN_COLOR = (pct) => {
  if (pct == null) return 'var(--text-3)';
  if (pct >= 70)   return 'var(--positive, #10b981)';
  if (pct >= 60)   return '#f59e0b';
  return 'var(--negative, #ef4444)';
};

const emptyDraft = () => ({
  menuName:     '',
  menuCategory: '피자',
  sizes:        [{ label: 'L', sellingPrice: '' }, { label: 'R', sellingPrice: '' }],
  ingredients:  [],
  note:         '',
});

function sizesToDraft(sizes) {
  return (sizes || []).map(s => ({
    ...s,
    sellingPrice: s.sellingPrice != null ? String(s.sellingPrice) : '',
  }));
}

function recToDraft(rec) {
  return {
    ...rec,
    sizes: rec.sizes?.length ? sizesToDraft(rec.sizes) : [{ label: '', sellingPrice: '' }],
    ingredients: (rec.ingredients || []).map(i => ({
      ...i,
      quantities: { ...(i.quantities || {}) },
    })),
  };
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function Page() {
  const [recipes,      setRecipes]      = useState([]);
  const [allMeta,      setAllMeta]      = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [selectedId,   setSelectedId]  = useState(null);
  const [isNew,        setIsNew]        = useState(false);
  const [draft,        setDraft]        = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);
  const [search,       setSearch]       = useState('');

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, recs] = await Promise.all([
      getPriceFiles(),
      getAllIngredients(),
      getAllRecipes(),
    ]);
    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const rows = await getPriceRowsByFileId(latest.id);
      rows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    }
    setAllMeta(meta);
    setUnitPriceMap(buildUnitPriceMap(meta, priceRowMap));
    setRecipes(recs);
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);

  // load 후 선택된 레시피 draft 동기화
  useEffect(() => {
    if (!isNew && selectedId != null) {
      const rec = recipes.find(r => r.id === selectedId);
      if (rec) setDraft(recToDraft(rec));
    }
  }, [recipes]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(id) {
    setSelectedId(id);
    setIsNew(false);
    const rec = recipes.find(r => r.id === id);
    if (rec) setDraft(recToDraft(rec));
  }

  function handleNew() {
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyDraft());
  }

  async function handleSave() {
    if (!draft?.menuName?.trim()) { showToast('메뉴명을 입력해주세요'); return; }
    setSaving(true);
    try {
      const savedId = await saveRecipe({
        ...draft,
        id: isNew ? undefined : selectedId,
        sizes: draft.sizes
          .filter(s => s.label?.trim())
          .map(s => ({ label: s.label, sellingPrice: s.sellingPrice !== '' ? Number(s.sellingPrice) : null })),
      });
      showToast(isNew ? '레시피 등록 완료' : '레시피 수정 완료');
      await load();
      setIsNew(false);
      setSelectedId(savedId);
    } catch (e) {
      showToast('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    const name = recipes.find(r => r.id === selectedId)?.menuName || '';
    if (!window.confirm(`"${name}" 레시피를 삭제할까요?`)) return;
    try {
      await deleteRecipe(selectedId);
      showToast('삭제 완료');
      setSelectedId(null);
      setIsNew(false);
      setDraft(null);
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message);
    }
  }

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(r =>
      (r.menuName || '').toLowerCase().includes(q) ||
      (r.menuCategory || '').toLowerCase().includes(q)
    );
  }, [recipes, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of filteredRecipes) {
      const cat = r.menuCategory || '기타';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    }
    const order = [...MENU_CATEGORIES, '기타'];
    return [...map.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b, 'ko');
    });
  }, [filteredRecipes]);

  const showEditor = isNew || selectedId != null;

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '원가 계산']} title="메뉴 원가 계산" sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>데이터베이스 오류: {dbError}</div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '원가 계산']}
        title="메뉴 원가 계산"
        sub="사이즈별 식자재 사용량을 입력하면 원가와 마진율이 자동 계산됩니다."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, marginTop: 8, alignItems: 'start' }}>

        {/* ── 왼쪽: 메뉴 목록 ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--divider)' }}>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleNew}>
              <Icon.plus style={{ width: 13, height: 13 }}/> 새 메뉴 추가
            </button>
            <div className="filter-search" style={{ marginTop: 8 }}>
              <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="메뉴명 검색"/>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>로딩 중…</div>
          ) : recipes.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              등록된 메뉴가 없습니다
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
              {grouped.map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ padding: '6px 14px 3px', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: 'var(--surface-2)' }}>
                    {cat}
                  </div>
                  {items.map(r => {
                    const costMap = calcCostBySizes(r, unitPriceMap);
                    const active  = r.id === selectedId;
                    return (
                      <button key={r.id} onClick={() => handleSelect(r.id)}
                        style={{ display: 'block', width: '100%', textAlign: 'left',
                          padding: '9px 14px', border: 0, cursor: 'pointer',
                          background: active ? 'var(--accent-soft, rgba(56,189,248,.12))' : 'transparent',
                          borderLeft: active ? '3px solid var(--accent, #38bdf8)' : '3px solid transparent',
                          transition: 'background .12s' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>
                          {r.menuName}
                        </div>
                        <div style={{ marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {(r.sizes || []).map(s => {
                            const cost = costMap[s.label] || 0;
                            const mr   = calcMarginRate(cost, s.sellingPrice);
                            return (
                              <span key={s.label} style={{ fontSize: 10, fontWeight: 600,
                                color: MARGIN_COLOR(mr), background: 'var(--surface-2)',
                                padding: '1px 5px', borderRadius: 3 }}>
                                {s.label} {cost > 0 ? formatNumber(Math.round(cost)) + '원' : '—'}
                                {mr != null ? ` (${mr.toFixed(0)}%)` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 오른쪽: 에디터 ── */}
        {showEditor && draft ? (
          <RecipeEditor
            key={isNew ? 'new' : selectedId}
            draft={draft}
            setDraft={setDraft}
            allMeta={allMeta}
            unitPriceMap={unitPriceMap}
            isNew={isNew}
            saving={saving}
            onSave={handleSave}
            onDelete={!isNew ? handleDelete : null}
            onCancel={() => { setIsNew(false); setSelectedId(null); setDraft(null); }}
          />
        ) : (
          <div className="card" style={{ minHeight: 280, display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
              <Icon.box style={{ width: 28, height: 28, opacity: .4, marginBottom: 8 }}/>
              <div style={{ fontSize: 13 }}>메뉴를 선택하거나 새로 추가하세요</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── 레시피 편집기 ─────────────────────────────────────────────
function RecipeEditor({ draft, setDraft, allMeta, unitPriceMap, isNew, saving, onSave, onDelete, onCancel }) {

  // 사이즈 목록 (label만 추출, 빈 것 제외)
  const sizeLabels = useMemo(
    () => draft.sizes.map(s => s.label).filter(Boolean),
    [draft.sizes]
  );

  function setField(key, val) {
    setDraft(d => ({ ...d, [key]: val }));
  }

  // 사이즈 행
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

  // 식자재 행
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

  // 사이즈별 총 원가
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
      </div>

      {/* 사이즈 & 판매가 */}
      <SectionLabel>사이즈 & 판매가</SectionLabel>
      <div style={{ marginBottom: 20 }}>
        {draft.sizes.map((s, i) => {
          const cost = s.label ? (costBySizes[s.label] || 0) : 0;
          const mr   = calcMarginRate(cost, s.sellingPrice ? Number(s.sellingPrice) : null);
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input className="form-input" value={s.label}
                onChange={e => setSize(i, 'label', e.target.value)}
                placeholder="L" style={{ width: 60 }}/>
              <input className="form-input" type="number" value={s.sellingPrice}
                onChange={e => setSize(i, 'sellingPrice', e.target.value)}
                placeholder="판매가" style={{ flex: 1 }}/>
              <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>원</span>
              {cost > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0, minWidth: 70 }}>
                  원가 {formatNumber(Math.round(cost))}원
                </span>
              )}
              {mr != null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: MARGIN_COLOR(mr), flexShrink: 0, minWidth: 42 }}>
                  {mr.toFixed(1)}%
                </span>
              )}
              {draft.sizes.length > 1 && (
                <button className="btn" style={{ padding: '3px 6px', flexShrink: 0 }} onClick={() => removeSize(i)}>
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
                          <input className="form-input" type="number" value={qty}
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
                        style={{ border: 0, background: 'transparent', cursor: 'pointer',
                          color: 'var(--text-4)', padding: '2px' }}>
                        <Icon.close style={{ width: 11, height: 11 }}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* 사이즈별 합계 행 */}
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

      {/* 식자재 추가 검색 */}
      <IngredientSearch
        allMeta={allMeta}
        unitPriceMap={unitPriceMap}
        onSelect={addIngredient}
        alreadyAdded={draft.ingredients.map(i => i.productCode)}
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

// ── 식자재 검색 추가 ──────────────────────────────────────────
function IngredientSearch({ allMeta, unitPriceMap, onSelect, alreadyAdded }) {
  const [q,    setQ]    = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const addedSet = useMemo(() => new Set(alreadyAdded), [alreadyAdded]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return allMeta.filter(m =>
      m.productCode &&
      !addedSet.has(m.productCode) &&
      ((m.ingredientName || '').toLowerCase().includes(term) ||
       (m.productCode    || '').toLowerCase().includes(term))
    ).slice(0, 15);
  }, [q, allMeta, addedSet]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function select(m) {
    onSelect(m);
    setQ('');
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 4 }}>
      <div className="filter-search" style={{ gap: 6 }}>
        <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }}/>
        <input value={q}
          onChange={e => { setQ(e.target.value); setOpen(!!e.target.value.trim()); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          placeholder="식자재 검색하여 추가…"/>
        {q && (
          <button onClick={() => { setQ(''); setOpen(false); }}
            style={{ border: 0, background: 'transparent', cursor: 'pointer',
              color: 'var(--text-4)', padding: 0, lineHeight: 1 }}>
            <Icon.close style={{ width: 12, height: 12 }}/>
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.15)',
          maxHeight: 260, overflowY: 'auto', marginTop: 2 }}>
          {results.map(m => {
            const info = unitPriceMap.get(m.productCode);
            return (
              <button key={m.productCode} onClick={() => select(m)}
                style={{ display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 14px', border: 0, background: 'transparent',
                  cursor: 'pointer', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{m.ingredientName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace' }}>{m.productCode}</span>
                  {info?.unitPrice != null
                    ? <span>{info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원/{info.baseUnitType}</span>
                    : <span style={{ color: '#f59e0b' }}>단가미등록</span>}
                  {m.baseQuantity && <span>{formatNumber(m.baseQuantity)}{m.baseUnitType}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 헬퍼 ─────────────────────────────────────────────────────
const thStyle = {
  padding: '5px 8px', textAlign: 'left', fontWeight: 600,
  fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap',
};

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--divider)' }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>{children}</div>;
}
