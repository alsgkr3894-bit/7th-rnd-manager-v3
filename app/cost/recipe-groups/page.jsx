'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap, MENU_CATEGORIES } from '@/lib/recipe';
import { getAllRecipeGroups, saveRecipeGroup, deleteRecipeGroup } from '@/lib/cost/recipe-groups/store';

const emptyGroup = () => ({
  name: '',
  description: '',
  sizes: ['L', 'R'],
  defaultCategories: ['피자', '피자/프리미엄 스페셜', '피자/프리미엄', '피자/오리지널', '피자/하프앤하프', '피자/하프앤하프'],
  ingredients: [],
});

function groupToDraft(g) {
  return {
    ...g,
    sizes: g.sizes?.length ? g.sizes : ['L', 'R'],
    defaultCategories: g.defaultCategories || [],
    ingredients: (g.ingredients || []).map(i => ({
      ...i,
      quantities: { ...(i.quantities || {}) },
    })),
  };
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function Page() {
  const [groups,       setGroups]       = useState([]);
  const [allMeta,      setAllMeta]      = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [selectedId,   setSelectedId]  = useState(null);
  const [isNew,        setIsNew]        = useState(false);
  const [draft,        setDraft]        = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, gs] = await Promise.all([
      getPriceFiles(),
      getAllIngredients(),
      getAllRecipeGroups(),
    ]);
    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const rows = await getPriceRowsByFileId(latest.id);
      rows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    }
    setAllMeta(meta);
    setUnitPriceMap(buildUnitPriceMap(meta, priceRowMap));
    setGroups(gs);
  }, []);

  useEffect(() => { load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false)); }, [load]);

  function handleSelect(id) {
    setSelectedId(id);
    setIsNew(false);
    const g = groups.find(r => r.id === id);
    if (g) setDraft(groupToDraft(g));
  }

  function handleNew() {
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyGroup());
  }

  async function handleSave() {
    if (!draft?.name?.trim()) { showToast('묶음 이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      const savedId = await saveRecipeGroup({
        ...draft,
        id: isNew ? undefined : selectedId,
      });
      showToast(isNew ? '묶음 등록 완료' : '묶음 수정 완료');
      await load();
      setIsNew(false);
      setSelectedId(isNew ? savedId : selectedId);
    } catch (e) {
      showToast('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    const name = groups.find(r => r.id === selectedId)?.name || '';
    if (!window.confirm(`"${name}" 묶음을 삭제할까요?`)) return;
    try {
      await deleteRecipeGroup(selectedId);
      showToast('삭제 완료');
      setSelectedId(null);
      setIsNew(false);
      setDraft(null);
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message);
    }
  }

  const showEditor = isNew || selectedId != null;

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '공통묶음 관리']} title="공통묶음 관리" sub="로드 실패"/>
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        데이터베이스 오류: {dbError}
      </div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '공통묶음 관리']}
        title="공통묶음 관리"
        sub="여러 메뉴에 공통으로 들어가는 고정 식자재를 묶음으로 정의하세요. 레시피 편집 시 선택하여 원가에 자동 반영됩니다."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginTop: 8, alignItems: 'start' }}>

        {/* ── 왼쪽: 목록 ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--divider)' }}>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleNew}>
              <Icon.plus style={{ width: 13, height: 13 }}/> 새 묶음 추가
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>로딩 중…</div>
          ) : groups.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              등록된 묶음이 없습니다
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
              {groups.map(g => {
                const active = g.id === selectedId;
                return (
                  <button key={g.id} onClick={() => handleSelect(g.id)}
                    style={{ display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', border: 0, cursor: 'pointer',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      사이즈: {(g.sizes || []).join(', ')} · 재료 {(g.ingredients || []).length}개
                    </div>
                    {g.defaultCategories?.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>
                        기본적용: {g.defaultCategories.slice(0, 3).join(', ')}{g.defaultCategories.length > 3 ? ` 외 ${g.defaultCategories.length - 3}개` : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 오른쪽: 에디터 ── */}
        {showEditor && draft ? (
          <GroupEditor
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
              <div style={{ fontSize: 13 }}>묶음을 선택하거나 새로 추가하세요</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── 그룹 편집기 ───────────────────────────────────────────────
function GroupEditor({ draft, setDraft, allMeta, unitPriceMap, isNew, saving, onSave, onDelete, onCancel }) {
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

  const ALL_CATS = [...MENU_CATEGORIES, '기타'];

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
      <SectionLabel>식자재</SectionLabel>
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
                        fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                        {total > 0 ? `${formatNumber(Math.round(total))}원` : '—'}
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

// ── 식자재 검색 (portal 방식) ─────────────────────────────────
function IngredientSearch({ allMeta, unitPriceMap, onSelect, alreadyAdded }) {
  const [q,         setQ]         = useState('');
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [rect,      setRect]      = useState(null);
  const ref     = useRef(null);
  const listRef = useRef(null);
  const addedSet = useMemo(() => new Set(alreadyAdded), [alreadyAdded]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return allMeta.filter(m =>
      m.productCode && !addedSet.has(m.productCode) &&
      ((m.ingredientName || '').toLowerCase().includes(term) ||
       (m.productCode    || '').toLowerCase().includes(term))
    ).slice(0, 15);
  }, [q, allMeta, addedSet]);

  useEffect(() => { setActiveIdx(-1); }, [results]);
  useEffect(() => {
    if (open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setRect({ top: r.bottom + 2, left: r.left, width: r.width });
    }
  }, [open, q]);
  useEffect(() => {
    const h = e => {
      if (ref.current && !ref.current.contains(e.target) &&
          !(listRef.current && listRef.current.contains(e.target))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    listRef.current.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function select(m) { onSelect(m); setQ(''); setOpen(false); setActiveIdx(-1); }

  function handleKeyDown(e) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0) select(results[activeIdx]); }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); }
  }

  const dropdown = open && results.length > 0 && rect && createPortal(
    <div ref={listRef} style={{
      position: 'fixed', top: rect.top, left: rect.left, width: rect.width,
      zIndex: 9999, background: 'var(--surface-1)', border: '1px solid var(--border)',
      borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.2)', maxHeight: 260, overflowY: 'auto',
    }}>
      {results.map((m, idx) => {
        const info = unitPriceMap.get(m.productCode);
        const isActive = idx === activeIdx;
        return (
          <button key={m.productCode} onClick={() => select(m)}
            onMouseEnter={() => setActiveIdx(idx)}
            style={{ display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 14px', border: 0,
              background: isActive ? 'var(--accent-soft)' : 'transparent',
              cursor: 'pointer', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: isActive ? 'var(--accent-text)' : undefined }}>
              {m.ingredientName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, display: 'flex', gap: 8 }}>
              <span style={{ fontFamily: 'monospace' }}>{m.productCode}</span>
              {info?.unitPrice != null
                ? <span>{info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원/{info.baseUnitType}</span>
                : <span style={{ color: '#f59e0b' }}>단가미등록</span>}
            </div>
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div ref={ref} style={{ marginTop: 8 }}>
      <div className="filter-search" style={{ gap: 6 }}>
        <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }}/>
        <input value={q}
          onChange={e => { setQ(e.target.value); setOpen(!!e.target.value.trim()); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="식자재 검색하여 추가… (↑↓ Enter)"/>
        {q && (
          <button onClick={() => { setQ(''); setOpen(false); }}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-4)', padding: 0 }}>
            <Icon.close style={{ width: 12, height: 12 }}/>
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
}

const thStyle = { padding: '5px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' };

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
