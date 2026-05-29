'use client';
import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipes, buildUnitPriceMap, calcCostBySizes } from '@/lib/recipe';
import { MENU_PRICE_CATEGORIES, getAllMenuPrices } from '@/lib/cost/menu-price';
import {
  loadPlatforms, savePlatforms,
  applyDiscount, calcNetRevenue, calcPlatformMargin,
} from '@/lib/cost/margin/platforms';
import { componentSubtotal } from '@/lib/cost/shared/calc';
import { getPizzaRecipeMap } from '@/lib/cost/pizza-detail';
import { getAllEdges } from '@/lib/cost/edge-dough/store';
import { edgeTotalCost } from '@/lib/cost/edge-dough/calc';
import { getPersonalRecipeMap } from '@/lib/cost/personal-detail';
import { getSideRecipeMap } from '@/lib/cost/side-detail';
import { getSetRecipeMap } from '@/lib/cost/set-detail';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { PlatformSettingsModal } from '@/components/cost/margin/PlatformSettingsModal';
import { SortableTh } from '@/components/ui/SortableTh';

// 원가율: 낮을수록 좋음
const MC_COST = (pct) => {
  if (pct == null) return 'var(--text-3)';
  if (pct <  0)   return 'var(--negative, #ef4444)';
  if (pct <= 30)  return 'var(--positive, #10b981)';
  if (pct <= 40)  return '#f59e0b';
  return 'var(--negative, #ef4444)';
};
// 마진율: 높을수록 좋음
const MC_MARGIN = (pct) => {
  if (pct == null) return 'var(--text-3)';
  if (pct <  0)   return 'var(--negative, #ef4444)';
  if (pct >= 70)  return 'var(--positive, #10b981)';
  if (pct >= 60)  return '#f59e0b';
  return 'var(--negative, #ef4444)';
};
const MC = (pct, mode) => mode === 'margin' ? MC_MARGIN(pct) : MC_COST(pct);

export default function Page() {
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);
  const [catFilter,    setCatFilter]    = useState('전체');
  const [platforms,    setPlatforms]    = useState([]);
  const [activePlatId, setActivePlatId] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  const [discOpen,     setDiscOpen]     = useState(false);
  const [discType,     setDiscType]     = useState('pct');   // 'pct' | 'fixed'
  const [discVal,      setDiscVal]      = useState('');
  const [viewMode,     setViewMode]     = useState('cost');  // 'cost' | 'margin'
  const [sortKey,      setSortKey]      = useState('');
  const [sortDir,      setSortDir]      = useState('asc');

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, recipes, allMenuPrices, pizzaMap, personalMap, sideMap, setMap, edges, allGroups] = await Promise.all([
      getPriceFiles(), getAllIngredients(), getAllRecipes(),
      getAllMenuPrices(),
      getPizzaRecipeMap(), getPersonalRecipeMap(), getSideRecipeMap(), getSetRecipeMap(),
      getAllEdges(),
      getAllRecipeGroups(),
    ]);

    // lib/recipe rows (old system)
    const latest = files[0] || null;
    const priceRowMap = new Map();
    if (latest) {
      const priceRows = await getPriceRowsByFileId(latest.id);
      priceRows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    }
    const upm = buildUnitPriceMap(meta, priceRowMap);

    // 레시피 rows — 공통묶음 원가까지 합산
    const recipeRows = recipes.map(r => {
      const baseCostMap = calcCostBySizes(r, upm);

      // 이 레시피에 적용할 그룹 ID 세트 결정
      const activeGids = r.groupIds == null
        ? new Set(allGroups.filter(g =>
            (g.defaultCategories || []).some(c =>
              (r.menuCategory || '') === c ||
              (r.menuCategory || '').startsWith(c + '/')
            )
          ).map(g => g.id))
        : new Set(r.groupIds);

      const costMap = {};
      for (const s of (r.sizes || [])) {
        if (!s.label) continue;
        let total = baseCostMap[s.label] || 0;
        for (const g of allGroups) {
          if (!activeGids.has(g.id)) continue;
          for (const ing of (g.ingredients || [])) {
            const info = upm.get(ing.productCode);
            if (!info?.unitPrice) continue;
            const qty = parseFloat(ing.quantities?.[s.label]) || 0;
            if (qty) total += info.unitPrice * qty;
          }
        }
        costMap[s.label] = total;
      }
      return { ...r, costMap };
    });

    // detail store rows (new system: pizza/personal/side/set)
    const DETAIL_STORE_MAP = {
      '피자':              pizzaMap,
      '피자/프리미엄 스페셜': pizzaMap,
      '피자/프리미엄':     pizzaMap,
      '피자/오리지널':     pizzaMap,
      '피자/하프앤하프':   pizzaMap,
      '1인피자':           personalMap,
      '세트박스':          setMap,
      '사이드':            sideMap,
      '소스':              sideMap,
      '음료':              sideMap,
      '엣지':              sideMap,
    };

    const calcComponentCost = (components) =>
      Array.isArray(components)
        ? Math.round(components.reduce((acc, c) => acc + componentSubtotal(c), 0))
        : 0;

    // Group menu prices by (menuName, category)
    const menuGroups = new Map();
    for (const m of allMenuPrices) {
      if (!DETAIL_STORE_MAP[m.category]) continue; // only detail-store categories
      const key = `${m.menuName}||${m.category}`;
      if (!menuGroups.has(key)) menuGroups.set(key, { menuName: m.menuName, category: m.category, entries: [] });
      menuGroups.get(key).entries.push({ menuCode: m.menuCode, size: m.size, price: m.price });
    }

    const detailRows = [];
    for (const { menuName, category, entries } of menuGroups.values()) {
      const recMap  = DETAIL_STORE_MAP[category];
      const costMap = {};
      const sizes   = [];
      for (const { menuCode, size, price } of entries) {
        sizes.push({ label: size, sellingPrice: price });
        const recipe = recMap?.get(menuCode);
        if (recipe) {
          const cost = calcComponentCost(recipe.components);
          if (cost > 0) costMap[size] = cost;
        }
      }
      detailRows.push({
        id:           `detail||${menuName}||${category}`,
        menuName,
        menuCategory: category,
        sizes,
        costMap,
        isDetailStore: true,
      });
    }

    // 엣지 원가 맵: edgeType → { size → cost }
    const EXPAND_EDGES = ['치즈크러스트', '골드스윗크러스트'];
    const PIZZA_EDGE_CATS = new Set([
      '피자', '피자/프리미엄 스페셜', '피자/프리미엄', '피자/오리지널', '피자/하프앤하프',
    ]);
    const edgeCostByType = {};
    for (const e of edges) {
      if (!EXPAND_EDGES.includes(e.edgeType)) continue;
      if (!edgeCostByType[e.edgeType]) edgeCostByType[e.edgeType] = {};
      edgeCostByType[e.edgeType][e.size] = edgeTotalCost(e);
    }

    // 엣지 판매가 맵: edgeType → price (메뉴 판매가에서 '엣지' 카테고리 조회)
    const edgePriceByType = {};
    for (const p of allMenuPrices) {
      if (p.category !== '엣지' || !p.price) continue;
      const name = (p.menuName || '').replace(/\s/g, '');
      for (const edgeType of EXPAND_EDGES) {
        if (name === edgeType.replace(/\s/g, '')) {
          edgePriceByType[edgeType] = p.price;
          break;
        }
      }
    }

    // recipe rows: menuName||category → row (원가 보완용, 중복 시 원가 있는 것 우선)
    const recipeByKey = new Map();
    for (const r of recipeRows) {
      const key = `${r.menuName}||${r.menuCategory || ''}`;
      const existing = recipeByKey.get(key);
      const hasCost = Object.values(r.costMap).some(v => v > 0);
      if (!existing || hasCost) recipeByKey.set(key, r);
    }

    // detail row에 원가 없으면 recipe row 원가로 보완
    const enrichedDetailRows = detailRows.map(d => {
      const hasCost = Object.values(d.costMap).some(v => v > 0);
      if (hasCost) return d;
      const rr = recipeByKey.get(`${d.menuName}||${d.menuCategory}`);
      if (!rr) return d;
      return { ...d, costMap: rr.costMap };
    });

    // Merge: detail store rows take precedence; recipe rows fill in the rest
    const detailKeys = new Set(enrichedDetailRows.map(r => `${r.menuName}||${r.menuCategory}`));
    const filteredRecipeRows = recipeRows.filter(r => {
      const cat = r.menuCategory || '';
      if (!cat) return true;
      return !detailKeys.has(`${r.menuName}||${cat}`);
    });

    // 엣지 파생 행 생성 — detail-store 피자 + 레시피 피자 모두 처리
    const derivedRows = [];
    const pizzaSources = [
      ...enrichedDetailRows.filter(r => PIZZA_EDGE_CATS.has(r.menuCategory || '')),
      ...filteredRecipeRows.filter(r => PIZZA_EDGE_CATS.has(r.menuCategory || '')),
    ];
    for (const r of pizzaSources) {
      for (const edgeType of EXPAND_EDGES) {
        const edgeCosts = edgeCostByType[edgeType];
        if (!edgeCosts) continue;
        const newCostMap = {};
        for (const s of (r.sizes || [])) {
          if (!s.label) continue;
          newCostMap[s.label] = (r.costMap?.[s.label] || 0) + (edgeCosts[s.label] || 0);
        }
        const derivedName = `${r.menuName} ${edgeType}`;
        if (detailKeys.has(`${derivedName}||${r.menuCategory}`)) continue;
        const edgePrice = edgePriceByType[edgeType] ?? null;
        derivedRows.push({
          id:           `derived||${r.id}||${edgeType}`,
          menuName:     derivedName,
          menuCategory: r.menuCategory,
          sizes:        (r.sizes || []).map(s => ({
            ...s,
            sellingPrice: s.sellingPrice != null && edgePrice != null
              ? s.sellingPrice + edgePrice
              : null, // 엣지 판매가 미등록 시 null → 원가율 '—'
          })),
          costMap:      newCostMap,
        });
      }
    }

    setRows([...enrichedDetailRows, ...filteredRecipeRows, ...derivedRows]);
    setPlatforms(loadPlatforms());
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);

  const activePlatform = useMemo(
    () => platforms.find(p => p.id === activePlatId) ?? platforms[0] ?? { id:'default', name:'기본', fees:[] },
    [platforms, activePlatId]
  );

  const discount = useMemo(() => {
    const v = parseFloat(discVal);
    if (!discOpen || !discVal || isNaN(v) || v <= 0) return null;
    return { type: discType, value: v };
  }, [discOpen, discType, discVal]);

  const hasAdjustment = !!(discount || activePlatform.fees?.length);

  const cats = useMemo(() => {
    const set = new Set(rows.map(r => r.menuCategory || '기타'));
    const order = [...MENU_PRICE_CATEGORIES, '기타'];
    return ['전체', ...[...set].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })];
  }, [rows]);

  const filtered = useMemo(() => {
    if (catFilter === '전체') return rows;
    return rows.filter(r => {
      const cat = r.menuCategory || '기타';
      // 정확 일치 또는 '피자' 선택 시 '피자/...' 전부 포함
      if (cat === catFilter) return true;
      if (catFilter === '피자' && cat.startsWith('피자/')) return true;
      return false;
    });
  }, [rows, catFilter]);

  const sizeLabels = useMemo(() => {
    const set = new Set();
    filtered.forEach(r => r.sizes?.forEach(s => { if (s.label) set.add(s.label); }));
    const order = ['L', 'R', '단일', '단품', '세트'];
    return [...set].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return ia !== -1 ? -1 : ib !== -1 ? 1 : a.localeCompare(b, 'ko');
    });
  }, [filtered]);

  const stats = useMemo(() => {
    // filtered 기준으로 계산 (catFilter 적용 후 테이블과 일치)
    if (!filtered.length) return null;
    const all = filtered.flatMap(r =>
      (r.sizes || []).map(s => {
        const cost = r.costMap?.[s.label] || 0;
        const eff  = applyDiscount(s.sellingPrice, discount);
        const net  = calcNetRevenue(eff, activePlatform.fees, s.label);
        return calcPlatformMargin(cost, net);
      }).filter(m => m != null)
    );
    if (!all.length) return null;
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    return { avg, above70: all.filter(m => m <= 30).length, below60: all.filter(m => m > 40).length };
  }, [filtered, activePlatform, discount]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered;

    function getVal(r) {
      if (sortKey === 'name') return (r.menuName || '').toLowerCase();
      if (sortKey === 'cat')  return (r.menuCategory || '기타').toLowerCase();
      const ul  = sortKey.indexOf('_');
      const type = sortKey.slice(0, ul);
      const size = sortKey.slice(ul + 1);
      if (type === 'cost') return r.costMap?.[size] ?? Infinity;
      const sv = r.sizes?.find(s => s.label === size);
      if (type === 'price') return sv?.sellingPrice ?? Infinity;
      const eff = applyDiscount(sv?.sellingPrice, discount);
      const net = calcNetRevenue(eff, activePlatform.fees, size);
      if (type === 'net') return net ?? Infinity;
      if (type === 'rate') {
        const cr = calcPlatformMargin(r.costMap?.[size] ?? 0, net);
        if (cr == null) return Infinity;
        return viewMode === 'margin' ? 100 - cr : cr;
      }
      return 0;
    }

    return [...filtered].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va === Infinity && vb === Infinity) return 0;
      if (va === Infinity) return 1;
      if (vb === Infinity) return -1;
      if (typeof va === 'string') {
        const c = va.localeCompare(vb, 'ko');
        return sortDir === 'asc' ? c : -c;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [filtered, sortKey, sortDir, discount, activePlatform, viewMode]);

  function handleSavePlatforms(newPlats) {
    savePlatforms(newPlats);
    setPlatforms(newPlats);
    if (!newPlats.find(p => p.id === activePlatId)) setActivePlatId('default');
    setShowSettings(false);
  }

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '원가마진표']} title="메뉴 원가마진표" sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>데이터베이스 오류: {dbError}</div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '원가마진표']}
        title="메뉴 원가마진표"
        sub="레시피 원가 기준 메뉴별 원가율 · 플랫폼·할인 시뮬레이션 지원"
      />

      {/* Stats */}
      {stats && (
        <div className="stat-row" style={{ marginTop:8 }}>
          <div className="stat-card">
            <div className="stat-label">
              평균 {viewMode === 'margin' ? '마진율' : '원가율'}{hasAdjustment ? ' ⟳' : ''}
            </div>
            <div className="stat-value" style={{ color: MC(viewMode === 'margin' ? 100 - stats.avg : stats.avg, viewMode) }}>
              {viewMode === 'margin' ? (100 - stats.avg).toFixed(1) : stats.avg.toFixed(1)}<span className="unit">%</span>
            </div>
          </div>
          {viewMode === 'cost' ? (
            <>
              <div className="stat-card">
                <div className="stat-label">원가율 30% 이하</div>
                <div className="stat-value" style={{ color:'var(--positive, #10b981)' }}>
                  {stats.above70}<span className="unit">개</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">원가율 40% 초과</div>
                <div className="stat-value" style={{ color:stats.below60 > 0 ? 'var(--negative, #ef4444)' : undefined }}>
                  {stats.below60}<span className="unit">개</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="stat-card">
                <div className="stat-label">마진율 70% 이상</div>
                <div className="stat-value" style={{ color:'var(--positive, #10b981)' }}>
                  {stats.above70}<span className="unit">개</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">마진율 60% 미만</div>
                <div className="stat-value" style={{ color:stats.below60 > 0 ? 'var(--negative, #ef4444)' : undefined }}>
                  {stats.below60}<span className="unit">개</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Platform bar */}
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.05em', marginRight:2 }}>플랫폼</span>
        {platforms.map(p => (
          <button key={p.id}
            className={'chip' + (p.id === activePlatId ? ' active' : '')}
            onClick={() => setActivePlatId(p.id)}
          >
            {p.name}
            {p.id !== 'default' && p.fees?.length > 0 && (
              <span style={{ fontSize:10, marginLeft:4, opacity:.55 }}>{p.fees.length}건</span>
            )}
          </button>
        ))}
        <button className="btn sm" onClick={() => setShowSettings(true)} title="플랫폼 설정">
          <Icon.gear style={{ width:13, height:13 }}/>
        </button>
        <div style={{ marginLeft:'auto' }}>
          <button
            className={'btn sm' + (discOpen ? ' primary' : '')}
            onClick={() => setDiscOpen(o => !o)}
            style={{ fontSize:11, display:'flex', alignItems:'center', gap:4 }}
          >
            <Icon.calc style={{ width:12, height:12 }}/>
            할인 시뮬레이터
            {discount && <span style={{ fontWeight:700, marginLeft:2 }}>ON</span>}
          </button>
        </div>
      </div>

      {/* Discount simulator bar */}
      {discOpen && (
        <div className="card" style={{ padding:'10px 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginTop:6 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-2)', whiteSpace:'nowrap' }}>할인 적용</span>

          {/* Type toggle */}
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:6, overflow:'hidden' }}>
            {(['pct', 'fixed']).map(t => (
              <button key={t} onClick={() => { setDiscType(t); setDiscVal(''); }}
                style={{
                  padding:'5px 12px', fontSize:12, fontWeight:600, border:'none',
                  background: discType === t ? 'var(--accent)' : 'var(--surface-2)',
                  color: discType === t ? '#fff' : 'var(--text-2)',
                  cursor:'pointer',
                }}
              >
                {t === 'pct' ? '% 할인' : '원 할인'}
              </button>
            ))}
          </div>

          {/* Value input */}
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <input
              className="form-input"
              type="number"
              value={discVal}
              onChange={e => setDiscVal(e.target.value)}
              placeholder={discType === 'pct' ? '예) 20' : '예) 5000'}
              style={{ width:90, textAlign:'right' }}
            />
            <span style={{ fontSize:12, color:'var(--text-3)' }}>{discType === 'pct' ? '%' : '원'}</span>
          </div>

          {/* Status badge */}
          {discount ? (
            <span style={{ fontSize:12, color:'var(--accent)', background:'var(--surface-2)', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
              {discType === 'pct' ? `${discount.value}% 할인` : `${formatNumber(discount.value)}원 할인`} 적용 중
            </span>
          ) : discVal ? (
            <span style={{ fontSize:11, color:'var(--text-4)' }}>양수 값을 입력하세요</span>
          ) : null}

          <button className="btn sm" onClick={() => setDiscVal('')}
            style={{ marginLeft:'auto', fontSize:11, color:'var(--text-3)' }}>
            초기화
          </button>
        </div>
      )}

      {/* Platform fee summary (non-default) */}
      {activePlatform.fees?.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-4)' }}>차감:</span>
          {activePlatform.fees.map(f => (
            <span key={f.id} style={{ fontSize:11, color:'var(--text-3)',
              background:'var(--surface-2)', padding:'2px 10px', borderRadius:4, display:'inline-flex', gap:4, alignItems:'center' }}>
              <b style={{ color:'var(--text-2)' }}>{f.label}</b>
              {f.type === 'pct'
                ? `${f.value}%`
                : feeAmountLabel(f)}
            </span>
          ))}
        </div>
      )}

      {/* 원가율 / 마진율 탭 */}
      <div style={{ display:'flex', gap:0, margin:'12px 0 0', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', alignSelf:'flex-start', width:'fit-content' }}>
        {[{ key:'cost', label:'원가율' }, { key:'margin', label:'마진율' }].map(({ key, label }) => (
          <button key={key} onClick={() => setViewMode(key)}
            style={{
              padding:'7px 22px', fontSize:13, fontWeight:700, border:'none', cursor:'pointer',
              background: viewMode === key ? 'var(--accent)' : 'var(--surface-2)',
              color: viewMode === key ? '#fff' : 'var(--text-2)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'8px 0 8px' }}>
        {cats.map(c => (
          <button key={c} className={'chip' + (catFilter === c ? ' active' : '')}
            onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>로딩 중…</div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
          <Icon.box style={{ width:28, height:28, opacity:.4, marginBottom:8 }}/>
          <div style={{ fontSize:13 }}>원가 레시피 탭에서 메뉴를 먼저 등록해주세요</div>
        </div>
      ) : (
        <div className="card table-card">
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh sortKey="name" active={sortKey} dir={sortDir} onClick={handleSort} width={160}>메뉴명</SortableTh>
                  <SortableTh sortKey="cat"  active={sortKey} dir={sortDir} onClick={handleSort} width={90}>카테고리</SortableTh>
                  {sizeLabels.map(l => (
                    <SortableTh key={l+'_c'} sortKey={`cost_${l}`} active={sortKey} dir={sortDir} onClick={handleSort} width={100} right>{l} 원가</SortableTh>
                  ))}
                  {sizeLabels.map(l => (
                    <SortableTh key={l+'_p'} sortKey={`price_${l}`} active={sortKey} dir={sortDir} onClick={handleSort} width={100} right>{l} 판매가</SortableTh>
                  ))}
                  {hasAdjustment && sizeLabels.map(l => (
                    <SortableTh key={l+'_n'} sortKey={`net_${l}`} active={sortKey} dir={sortDir} onClick={handleSort} width={120} right>
                      <span style={{ color:'var(--accent)' }}>{l} 할인적용금액</span>
                    </SortableTh>
                  ))}
                  {sizeLabels.map(l => (
                    <SortableTh key={l+'_m'} sortKey={`rate_${l}`} active={sortKey} dir={sortDir} onClick={handleSort} width={96} right>
                      {l} {viewMode === 'margin' ? '마진율' : '원가율'}
                    </SortableTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map(r => (
                  <MarginRow
                    key={r.id}
                    r={r}
                    sizeLabels={sizeLabels}
                    activePlatform={activePlatform}
                    discount={discount}
                    hasAdjustment={hasAdjustment}
                    viewMode={viewMode}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)' }}>
            {filtered.length}개 메뉴
            {hasAdjustment && (
              <span style={{ marginLeft:8, color:'var(--accent)' }}>
                · {activePlatform.id !== 'default' ? activePlatform.name : ''}
                {activePlatform.id !== 'default' && discount ? ' + ' : ''}
                {discount ? (discType === 'pct' ? `${discount.value}% 할인` : `${formatNumber(discount.value)}원 할인`) : ''} 적용 중
              </span>
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <PlatformSettingsModal
          platforms={platforms}
          onSave={handleSavePlatforms}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}

const MarginRow = memo(function MarginRow({ r, sizeLabels, activePlatform, discount, hasAdjustment, viewMode }) {
  return (
    <tr>
      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.menuName}</td>
      <td style={{ whiteSpace: 'nowrap' }}><span className="chip">{r.menuCategory || '기타'}</span></td>

      {/* 원가 */}
      {sizeLabels.map(l => {
        const cost = r.costMap?.[l] || 0;
        return (
          <td key={l+'_c'} style={{ textAlign:'right', color:'var(--text-2)' }}>
            {cost > 0 ? `${formatNumber(Math.round(cost))}원` : '—'}
          </td>
        );
      })}

      {/* 판매가 */}
      {sizeLabels.map(l => {
        const s = r.sizes?.find(s => s.label === l);
        return (
          <td key={l+'_p'} style={{ textAlign:'right', color:'var(--text-2)' }}>
            {s?.sellingPrice != null ? `${formatNumber(s.sellingPrice)}원` : '—'}
          </td>
        );
      })}

      {/* 할인적용금액 (플랫폼/할인 조정 시만) */}
      {hasAdjustment && sizeLabels.map(l => {
        const s = r.sizes?.find(s => s.label === l);
        if (!s?.sellingPrice) return <td key={l+'_n'} style={{ textAlign:'right', color:'var(--text-3)' }}>—</td>;
        const eff = applyDiscount(s.sellingPrice, discount);
        const net = calcNetRevenue(eff, activePlatform.fees, l);
        return (
          <td key={l+'_n'} style={{ textAlign:'right', fontSize:12, color:'var(--text-2)' }}>
            {formatNumber(Math.round(net))}원
            {eff !== s.sellingPrice && (
              <div style={{ fontSize:10, color:'var(--text-4)' }}>
                {formatNumber(eff)}원 기준
              </div>
            )}
          </td>
        );
      })}

      {/* 원가율 / 마진율 */}
      {sizeLabels.map(l => {
        const cost    = r.costMap?.[l] || 0;
        const s       = r.sizes?.find(s => s.label === l);
        const eff     = applyDiscount(s?.sellingPrice, discount);
        const net     = calcNetRevenue(eff, activePlatform.fees, l);
        const costRate = calcPlatformMargin(cost, net); // 원가율
        const display  = costRate != null
          ? (viewMode === 'margin' ? 100 - costRate : costRate)
          : null;
        const baseCostRate = hasAdjustment
          ? calcPlatformMargin(cost, s?.sellingPrice || 0)
          : null;
        const baseDisplay = baseCostRate != null
          ? (viewMode === 'margin' ? 100 - baseCostRate : baseCostRate)
          : null;
        return (
          <td key={l+'_m'} style={{ textAlign:'right' }}>
            {display != null ? (
              <span style={{ fontWeight:700, color: MC(display, viewMode) }}>{display.toFixed(1)}%</span>
            ) : '—'}
            {baseDisplay != null && baseDisplay !== display && (
              <span style={{ fontSize:10, color:'var(--text-4)', marginLeft:5 }}>
                ({baseDisplay.toFixed(1)}%)
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
});

/** 고정비 fee의 표시 문자열 — 사이즈 오버라이드 있으면 전부 표시 */
function feeAmountLabel(f) {
  const base = f.value ?? 0;
  const ov   = f.sizeOverrides || {};
  const hasL = ov.L != null && ov.L !== '';
  const hasR = ov.R != null && ov.R !== '';

  if (!hasL && !hasR) return `${formatNumber(base)}원`;

  const parts = [`공통 ${formatNumber(base)}원`];
  if (hasL) parts.push(`L ${formatNumber(ov.L)}원`);
  if (hasR) parts.push(`R ${formatNumber(ov.R)}원`);
  return parts.join(' · ');
}
