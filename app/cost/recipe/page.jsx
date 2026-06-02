'use client';
import { useEffect, useRef, useState, useMemo, useCallback, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import {
  getAllRecipes, saveRecipe, deleteRecipe,
  buildUnitPriceMap, calcCostBySizes, calcMarginRate,
  MENU_CATEGORIES,
} from '@/lib/recipe';
import { getAllMenuMaster } from '@/lib/menu-master/store';
import { normalizePersonalPizzaCodes } from '@/lib/menu-master/normalize';
import { getAllMenuPrices } from '@/lib/cost/menu-price/store';
import { parseMenuCode } from '@/lib/cost/menu-price/code';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { costRateColor } from '@/lib/cost/rate-color';
import { KEYS } from '@/lib/note/keys';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TabButton } from '@/components/cost/shared/TabButton';
import { CommonManageView } from '@/components/cost/manage/CommonManageView';
import dynamic from 'next/dynamic';

const RecipeEditor = dynamic(
  () => import('@/components/cost/recipe/RecipeEditor').then(m => ({ default: m.RecipeEditor })),
  { loading: () => <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div> }
);

const emptyDraft = () => ({
  menuCode:     '',
  menuName:     '',
  menuCategory: '피자',
  sizes:        [{ label: 'L', sellingPrice: '' }, { label: 'R', sellingPrice: '' }],
  ingredients:  [],
  groupIds:     null, // null = 카테고리 기본값 사용
  note:         '',
});

function sizesToDraft(sizes) {
  return (sizes || []).map(s => ({
    ...s,
    sellingPrice: s.sellingPrice != null ? String(s.sellingPrice) : '',
  }));
}

function prepareRecipeForEdit(rec) {
  return {
    ...rec,
    sizes: rec.sizes?.length ? sizesToDraft(rec.sizes) : [{ label: '', sellingPrice: '' }],
    ingredients: (rec.ingredients || []).map(i => ({
      ...i,
      quantities: { ...(i.quantities || {}) },
    })),
  };
}

function handleExportCsv(filtered) {
  const headers = ['메뉴코드', '메뉴명', '카테고리', '규격'];
  const rows = filtered.map(r => [r.menuCode||'', r.menuName||'', r.menuCategory||'', r.size||'']);
  const csv = [headers, ...rows].map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = '레시피목록.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function Page() {
  return (
    <Suspense fallback={<main className="main"><div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div></main>}>
      <RecipeContent />
    </Suspense>
  );
}

function RecipeContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [recipes,        setRecipes]        = useState([]);
  const [allMeta,        setAllMeta]        = useState([]);
  const [menuMasters,    setMenuMasters]    = useState([]);
  const [unitPriceMap,   setUnitPriceMap]   = useState(new Map());
  const [menuPricesMap,  setMenuPricesMap]  = useState(new Map());
  const [allGroups,      setAllGroups]      = useState([]);
  const [selectedId,     setSelectedId]    = useState(null);
  // from=sample 파라미터: URL sync effect보다 먼저 읽어야 하므로 useState initializer 사용
  const [isNew,        setIsNew]        = useState(() => searchParams?.get('from') === 'sample');
  const [draft,        setDraft]        = useState(() => {
    if (searchParams?.get('from') !== 'sample') return null;
    const name = searchParams.get('name') || '';
    const cat  = searchParams.get('cat')  || '피자';
    return { ...emptyDraft(), menuName: name, menuCategory: MENU_CATEGORIES.includes(cat) ? cat : '피자' };
  });
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);
  const [search,       setSearch]       = useState(() => searchParams?.get('q') || '');
  const [tab,          setTab]          = useState(() => {
    const t = searchParams?.get('tab');
    return (t === 'groups' || t === 'edges') ? t : 'recipe';
  });
  const [customOrder,  setCustomOrder]  = useState(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(KEYS.RECIPE_SORT) || '{}'); }
    catch { return {}; }
  });
  const [dragSrc,   setDragSrc]    = useState(null);  // { cat, fromIdx }
  const [dropTarget, setDropTarget] = useState(null); // { cat, beforeIdx }
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // selectedId 변경 감지용 ref — draft 동기화 effect에서 불필요한 재실행 방지
  const prevSelectedId = useRef(null);

  const load = useCallback(async () => {
    await initDB();
    await normalizePersonalPizzaCodes().catch(e => console.warn('[recipe] 코드 정규화 실패', e));
    const [files, meta, recs, masters, menuPrices, groups] = await Promise.all([
      getPriceFiles(),
      getAllIngredients(),
      getAllRecipes(),
      getAllMenuMaster(),
      getAllMenuPrices(),
      getAllRecipeGroups(),
    ]);
    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const rows = await getPriceRowsByFileId(latest.id);
      rows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    }
    // 판매가 맵: baseCode → { L: price, R: price, ... }
    const pmap = new Map();
    for (const p of menuPrices) {
      const parsed = parseMenuCode(p.menuCode);
      const base = parsed
        ? `${parsed.prefix}-${String(parsed.base).padStart(3, '0')}`
        : p.menuCode;
      if (!pmap.has(base)) pmap.set(base, {});
      pmap.get(base)[p.size] = p.price;
    }
    setAllMeta(meta);
    setMenuMasters(masters);
    setMenuPricesMap(pmap);
    setUnitPriceMap(buildUnitPriceMap(meta, priceRowMap));
    setRecipes(recs);
    setAllGroups(groups);
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);

  useVisibilityRefresh(load);

  // URL sync for search filter + active tab
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'recipe') params.set('tab', tab);
    if (search) params.set('q', search);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [search, tab, pathname]);

  // load 후 선택된 레시피 draft 동기화 — selectedId가 실제로 바뀔 때만 실행
  useEffect(() => {
    if (!isNew && selectedId != null && selectedId !== prevSelectedId.current) {
      prevSelectedId.current = selectedId;
      const rec = recipes.find(r => r.id === selectedId);
      if (rec) setDraft(prepareRecipeForEdit(rec));
    } else if (isNew) {
      prevSelectedId.current = null;
    }
  }, [recipes, isNew, selectedId]);

  function handleSelect(id) {
    setSelectedId(id);
    setIsNew(false);
    const rec = recipes.find(r => r.id === id);
    if (rec) setDraft(prepareRecipeForEdit(rec));
  }

  function handleNew() {
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyDraft());
  }

  async function handleSave() {
    if (saving) return; // 연타/단축키 중복 저장 방지
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

  async function handleDuplicate(recipeId, e) {
    e?.stopPropagation();
    const rec = recipes.find(r => r.id === recipeId);
    if (!rec) return;
    try {
      const { id: _id, updatedAt: _updatedAt, ...rest } = rec;
      const newId = await saveRecipe({
        ...rest,
        menuName: `복사본 - ${rec.menuName}`,
        menuCode: '',
      });
      showToast(`"${rec.menuName}" 복제 완료`);
      await load();
      setIsNew(false);
      setSelectedId(newId);
    } catch (err) {
      showToast('복제 실패: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    try {
      await deleteRecipe(id);
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
      (r.menuCategory || '').toLowerCase().includes(q) ||
      (r.menuCode || '').toLowerCase().includes(q)
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
    const sorted = [...map.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b, 'ko');
    });
    // 커스텀 순서 적용
    return sorted.map(([cat, items]) => {
      const ids = customOrder[cat];
      if (!ids?.length) return [cat, items];
      const byId = new Map(items.map(r => [r.id, r]));
      const ordered = ids.map(id => byId.get(id)).filter(Boolean);
      const inOrder = new Set(ids);
      const rest = items.filter(r => !inOrder.has(r.id)); // 새로 추가된 항목
      return [cat, [...ordered, ...rest]];
    });
  }, [filteredRecipes, customOrder]);

  function saveOrder(cat, items) {
    const newOrder = { ...customOrder, [cat]: items.map(r => r.id) };
    setCustomOrder(newOrder);
    try { localStorage.setItem(KEYS.RECIPE_SORT, JSON.stringify(newOrder)); } catch {}
  }
  function resetCatOrder(cat) {
    const { [cat]: _removed, ...rest } = customOrder;
    setCustomOrder(rest);
    try { localStorage.setItem(KEYS.RECIPE_SORT, JSON.stringify(rest)); } catch {}
  }

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
        masterSource
        sub="사이즈별 식자재 사용량을 입력하면 원가와 원가율이 자동 계산됩니다."
        actions={tab === 'recipe' ? (
          <button className="btn" onClick={() => { handleExportCsv(filteredRecipes); showToast(`CSV ${filteredRecipes.length}개 내보내기 완료`, 'ok'); }} disabled={filteredRecipes.length === 0}>
            <Icon.download style={{ width: 14, height: 14 }}/> CSV 내보내기
          </button>
        ) : undefined}
      />

      {/* 상단 탭 — 원가 레시피 / 묶음 관리 / 엣지 관리 (공통관리 통합) */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginTop: 8 }}>
        <TabButton active={tab === 'recipe'} onClick={() => setTab('recipe')}>원가 레시피</TabButton>
        <TabButton active={tab === 'groups'} onClick={() => setTab('groups')}>묶음 관리</TabButton>
        <TabButton active={tab === 'edges'}  onClick={() => setTab('edges')}>엣지 관리</TabButton>
      </div>

      {tab !== 'recipe' && (
        <div style={{ marginTop: 16 }}>
          <CommonManageView tab={tab} />
        </div>
      )}

      {tab === 'recipe' && (
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
            <div className="empty-state" style={{ margin: 16 }}>
              <div className="empty-icon-wrap"><Icon.doc style={{ width: 32, height: 32 }}/></div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>레시피가 없어요</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>새 레시피를 추가해보세요</div>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="empty-state" style={{ margin: 16 }}>
              <div className="empty-icon-wrap"><Icon.search style={{ width: 28, height: 28 }}/></div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>검색 결과가 없어요</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>다른 키워드로 검색해보세요</div>
            </div>
          ) : (
            <div
              style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null);
              }}
            >
              {grouped.map(([cat, items]) => {
                const hasCustOrder = !!customOrder[cat]?.length;
                return (
                  <div key={cat}>
                    {/* 카테고리 헤더 */}
                    <div style={{ padding: '6px 14px 3px', fontSize: 11, fontWeight: 700,
                      color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{cat}</span>
                      {hasCustOrder && !search && (
                        <button
                          onClick={() => resetCatOrder(cat)}
                          title="이 카테고리 순서 초기화"
                          style={{ fontSize: 9, color: 'var(--text-4)', border: 0,
                            background: 'transparent', cursor: 'pointer', padding: '0 2px',
                            fontWeight: 500, letterSpacing: 0 }}>
                          순서초기화
                        </button>
                      )}
                    </div>

                    {/* 아이템 목록 */}
                    {items.map((r, idx) => {
                      const recipeCostMap = calcCostBySizes(r, unitPriceMap);
                      const activeGids = r.groupIds == null
                        ? new Set(allGroups.filter(g => (g.defaultCategories || []).some(c =>
                            (r.menuCategory || '') === c || (r.menuCategory || '').startsWith(c + '/')
                          )).map(g => g.id))
                        : new Set(r.groupIds);
                      const costMap = {};
                      for (const s of (r.sizes || [])) {
                        let total = recipeCostMap[s.label] || 0;
                        for (const g of allGroups) {
                          if (!activeGids.has(g.id)) continue;
                          for (const ing of (g.ingredients || [])) {
                            const info = unitPriceMap.get(ing.productCode);
                            if (!info?.unitPrice) continue;
                            const qty = parseFloat(ing.quantities?.[s.label]) || 0;
                            if (qty) total += info.unitPrice * qty;
                          }
                        }
                        costMap[s.label] = total;
                      }
                      const active    = r.id === selectedId;
                      const isDragging = dragSrc?.cat === cat && dragSrc?.fromIdx === idx;
                      const showTop    = !search && dropTarget?.cat === cat && dropTarget?.beforeIdx === idx;
                      const showBot    = !search && idx === items.length - 1
                        && dropTarget?.cat === cat && dropTarget?.beforeIdx === items.length;

                      return (
                        <div key={r.id}
                          draggable={!search}
                          onDragStart={e => {
                            e.dataTransfer.effectAllowed = 'move';
                            setDragSrc({ cat, fromIdx: idx });
                            setDropTarget(null);
                          }}
                          onDragOver={e => {
                            e.preventDefault();
                            if (!dragSrc || dragSrc.cat !== cat) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const before = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
                            setDropTarget(prev =>
                              prev?.cat === cat && prev?.beforeIdx === before
                                ? prev : { cat, beforeIdx: before }
                            );
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            const src = dragSrc;
                            setDragSrc(null); setDropTarget(null);
                            if (!src || src.cat !== cat) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            let insertAt = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
                            if (src.fromIdx < insertAt) insertAt--;
                            if (src.fromIdx === insertAt) return;
                            const arr = [...items];
                            const [moved] = arr.splice(src.fromIdx, 1);
                            arr.splice(insertAt, 0, moved);
                            saveOrder(cat, arr);
                          }}
                          onDragEnd={() => { setDragSrc(null); setDropTarget(null); }}
                          style={{
                            display: 'flex', alignItems: 'stretch',
                            borderTop:    showTop ? '2px solid var(--accent)' : '2px solid transparent',
                            borderBottom: showBot ? '2px solid var(--accent)' : '2px solid transparent',
                            opacity: isDragging ? 0.35 : 1,
                          }}
                        >
                          {/* 드래그 핸들 */}
                          {!search && (
                            <div style={{
                              display: 'flex', alignItems: 'center',
                              paddingLeft: 8, paddingRight: 2,
                              cursor: 'grab', color: 'var(--text-4)',
                              flexShrink: 0, userSelect: 'none', fontSize: 13,
                            }}>
                              <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                                <circle cx="3" cy="3"  r="1.4"/>
                                <circle cx="7" cy="3"  r="1.4"/>
                                <circle cx="3" cy="8"  r="1.4"/>
                                <circle cx="7" cy="8"  r="1.4"/>
                                <circle cx="3" cy="13" r="1.4"/>
                                <circle cx="7" cy="13" r="1.4"/>
                              </svg>
                            </div>
                          )}
                          {/* 선택 버튼 */}
                          <button onClick={() => handleSelect(r.id)}
                            style={{ flex: 1, display: 'block', textAlign: 'left',
                              padding: search ? '9px 14px' : '9px 14px 9px 4px',
                              border: 0, cursor: 'pointer',
                              background: active ? 'var(--accent-soft, rgba(56,189,248,.12))' : 'transparent',
                              borderLeft: active ? '3px solid var(--accent, #38bdf8)' : '3px solid transparent',
                              transition: 'background .12s' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {r.menuName}
                              {r.menuCode && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-text)', background: 'var(--accent-soft)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>
                                  {r.menuCode}
                                </span>
                              )}
                            </div>
                            <div style={{ marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {(r.sizes || []).map(s => {
                                const cost = costMap[s.label] || 0;
                                const mr   = calcMarginRate(cost, s.sellingPrice);
                                return (
                                  <span key={s.label} style={{ fontSize: 10, fontWeight: 600,
                                    color: costRateColor(mr), background: 'var(--surface-2)',
                                    padding: '1px 5px', borderRadius: 3 }}>
                                    {s.label} {cost > 0 ? formatNumber(Math.round(cost)) + '원' : '—'}
                                    {mr != null ? ` (${mr.toFixed(0)}%)` : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </button>
                          {/* 복제 버튼 */}
                          <button
                            title="레시피 복제"
                            onClick={e => handleDuplicate(r.id, e)}
                            style={{
                              flexShrink: 0, alignSelf: 'center',
                              marginRight: 6, padding: '3px 7px',
                              fontSize: 10, fontWeight: 600,
                              border: '1px solid var(--border)',
                              borderRadius: 5, cursor: 'pointer',
                              background: 'var(--surface-2)',
                              color: 'var(--text-3)',
                              lineHeight: 1.4,
                            }}>
                            복제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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
            menuMasters={menuMasters}
            menuPricesMap={menuPricesMap}
            unitPriceMap={unitPriceMap}
            allGroups={allGroups}
            isNew={isNew}
            saving={saving}
            onSave={handleSave}
            onDelete={!isNew ? () => setPendingDeleteId(selectedId) : null}
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
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          open
          message="레시피를 삭제할까요?"
          danger
          onConfirm={() => { handleDelete(pendingDeleteId); setPendingDeleteId(null); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </main>
  );
}
