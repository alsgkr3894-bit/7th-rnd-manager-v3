'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
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
import { edgeTotalCost, EXPAND_EDGE_TYPES } from '@/lib/cost/edge-dough';
import { getPersonalRecipeMap } from '@/lib/cost/personal-detail';
import { getSideRecipeMap } from '@/lib/cost/side-detail';
import { getSetRecipeMap } from '@/lib/cost/set-detail';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { createDefaultGroupResolver } from '@/lib/cost/recipe-groups/apply';
import { MarginFilterBar } from '@/components/cost/margin/MarginFilterBar';
import { MarginSummaryCards } from '@/components/cost/margin/MarginSummaryCards';
import { saveSnapshot } from '@/lib/cost/margin/snapshots';
import { showToast } from '@/components/Toast';
import { SortableTh } from '@/components/ui/SortableTh';
import { MarginRow } from '@/components/cost/margin/MarginRow';
import { exportMarginExcel } from '@/lib/cost/margin/export';
import { COST_RATE_THRESHOLD as COST_RATE, MARGIN_RATE_THRESHOLD as MARGIN_RATE } from '@/lib/cost/margin/constants';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { KEYS } from '@/lib/note/keys';

const PlatformSettingsModal = dynamic(
  () => import('@/components/cost/margin/PlatformSettingsModal').then(m => m.PlatformSettingsModal),
  { ssr: false, loading: () => null }
);
const MarginTrendModal = dynamic(
  () => import('@/components/cost/margin/MarginTrendModal').then(m => m.MarginTrendModal),
  { ssr: false, loading: () => null }
);

export default function Page() {
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);
  const [catFilter,    setCatFilter]    = useState(() => { try { return localStorage.getItem(KEYS.MARGIN_CAT_FILTER) || '전체'; } catch { return '전체'; } });
  const [platforms,    setPlatforms]    = useState([]);
  const [activePlatId, setActivePlatId] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  const [showTrend,    setShowTrend]    = useState(false);
  const [discOpen,     setDiscOpen]     = useState(false);
  const [discType,     setDiscType]     = useState('pct');   // 'pct' | 'fixed'
  const [discVal,      setDiscVal]      = useState('');
  const [viewMode,     setViewMode]     = useState('cost');  // 'cost' | 'margin'
  const [sortKey,      setSortKey]      = useState('');
  const [sortDir,      setSortDir]      = useState('asc');
  const [search,       setSearch]       = useState('');

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

    // 카테고리별 기본 적용 그룹은 한 번만 계산해 재사용 (레시피마다 전체 그룹 순회 방지)
    const resolveDefaultGroupIds = createDefaultGroupResolver(allGroups);
    const groupById = new Map(allGroups.map(g => [g.id, g]));

    // 판매가 정규화: 레시피의 판매가는 문자열('18000'/'')이라 숫자/null로 통일
    // (할인·수수료 계산과 엣지 파생 행의 판매가 합산이 문자열 연결되지 않도록)
    const toNum = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

    // 레시피 rows — 공통묶음 원가까지 합산
    const recipeRows = recipes.map(r => {
      const baseCostMap = calcCostBySizes(r, upm);

      // 이 레시피에 적용할 그룹 ID 세트 결정
      const activeGids = r.groupIds == null
        ? resolveDefaultGroupIds(r.menuCategory)
        : new Set(r.groupIds);

      const costMap = {};
      for (const s of (r.sizes || [])) {
        if (!s.label) continue;
        let total = baseCostMap[s.label] || 0;
        // 적용 그룹만 순회 (전체 그룹 스캔 대신 활성 그룹 id 기준)
        for (const gid of activeGids) {
          const g = groupById.get(gid);
          if (!g) continue;
          for (const ing of (g.ingredients || [])) {
            const info = upm.get(ing.productCode);
            if (!info?.unitPrice) continue;
            const qty = parseFloat(ing.quantities?.[s.label]) || 0;
            if (qty) total += info.unitPrice * qty;
          }
        }
        costMap[s.label] = total;
      }
      const sizes = (r.sizes || []).map(s => ({ ...s, sellingPrice: toNum(s.sellingPrice) }));
      return { ...r, sizes, costMap };
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
    const EXPAND_EDGES = EXPAND_EDGE_TYPES;
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

    // detail-store 행에 원가레시피 정보 보완:
    //   - 디테일 스토어 값이 항상 우선
    //   - 레시피는 "빈 판매가 · 디테일에 없는 사이즈 · 빈 원가"만 채움(fallback)
    // (메뉴 가격표에 판매가가 없어도 원가레시피의 판매가가 표시되도록)
    const mergeRecipeIntoDetail = (d) => {
      const rr = recipeByKey.get(`${d.menuName}||${d.menuCategory}`);
      if (!rr) return d;

      // 사이즈 합집합 (디테일 우선, 레시피에만 있는 사이즈는 뒤에 추가)
      const sizeByLabel = new Map();
      for (const s of (d.sizes || [])) {
        if (s.label) sizeByLabel.set(s.label, { ...s, sellingPrice: toNum(s.sellingPrice) });
      }
      for (const s of (rr.sizes || [])) {
        if (!s.label) continue;
        const price = toNum(s.sellingPrice);
        const existing = sizeByLabel.get(s.label);
        if (!existing) sizeByLabel.set(s.label, { label: s.label, sellingPrice: price });
        else if (existing.sellingPrice == null && price != null) existing.sellingPrice = price;
      }

      // 원가 합집합 (디테일 원가 우선, 빈 사이즈만 레시피 원가로 보완)
      const costMap = { ...d.costMap };
      for (const label of sizeByLabel.keys()) {
        if (!(costMap[label] > 0) && rr.costMap?.[label] > 0) costMap[label] = rr.costMap[label];
      }

      return { ...d, sizes: [...sizeByLabel.values()], costMap };
    };

    const enrichedDetailRows = detailRows.map(mergeRecipeIntoDetail);

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

  useVisibilityRefresh(load);

  useEffect(() => { try { localStorage.setItem(KEYS.MARGIN_CAT_FILTER, catFilter); } catch {} }, [catFilter]);

  const activePlatform = useMemo(
    () => platforms.find(p => p.id === activePlatId) ?? platforms[0] ?? { id:'default', name:'기본', fees:[] },
    [platforms, activePlatId]
  );

  const discount = useMemo(() => {
    let v = parseFloat(discVal);
    if (!discOpen || !discVal || isNaN(v) || v <= 0) return null;
    if (discType === 'pct') v = Math.max(0, Math.min(100, v));
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
    let result = rows;
    if (catFilter !== '전체') {
      result = result.filter(r => {
        const cat = r.menuCategory || '기타';
        if (cat === catFilter) return true;
        if (catFilter === '피자' && cat.startsWith('피자/')) return true;
        return false;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(r =>
        (r.menuName     || '').toLowerCase().includes(q) ||
        (r.menuCategory || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, catFilter, search]);

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
    // Single reduce pass — avoids flatMap+map+filter allocations
    let sum = 0, count = 0;
    let lowCostCount = 0, highCostCount = 0, goodMarginCount = 0, badMarginCount = 0;
    for (const r of filtered) {
      for (const s of (r.sizes || [])) {
        const cost = r.costMap?.[s.label] || 0;
        const eff  = applyDiscount(s.sellingPrice, discount);
        const net  = calcNetRevenue(eff, activePlatform.fees, s.label);
        const m    = calcPlatformMargin(cost, net);
        if (m == null) continue;
        sum += m;
        count++;
        // cost view: lowCostCount = 원가율 ≤ 30%, highCostCount = 원가율 > 40%
        if (m <= COST_RATE.GOOD)    lowCostCount++;
        if (m >  COST_RATE.WARNING) highCostCount++;
        // margin view: goodMarginCount = 마진율 ≥ 70%, badMarginCount = 마진율 < 60%
        const margin = 100 - m;
        if (margin >= MARGIN_RATE.GOOD)    goodMarginCount++;
        if (margin <  MARGIN_RATE.WARNING) badMarginCount++;
      }
    }
    if (!count) return null;
    return {
      avg: sum / count,
      lowCostCount,
      highCostCount,
      goodMarginCount,
      badMarginCount,
    };
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
      const ul  = sortKey.lastIndexOf('_');
      if (ul === -1) return 0;
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

  async function handleSaveSnapshot() {
    if (!stats) { showToast('집계할 메뉴 데이터가 없어요', 'error'); return; }
    const avgCostRate = stats.avg;
    const avgMargin   = 100 - avgCostRate;
    const menuCount   = filtered.length;
    const label       = catFilter !== '전체' ? catFilter : '전체 메뉴';
    try {
      await saveSnapshot({ avgCostRate, avgMargin, menuCount, label });
      showToast('추이 스냅샷 저장 완료', 'ok');
    } catch (e) {
      console.error(e);
      showToast('스냅샷 저장 실패: ' + e.message, 'error');
    }
  }

  function handleSavePlatforms(newPlats) {
    savePlatforms(newPlats);
    setPlatforms(newPlats);
    if (!newPlats.find(p => p.id === activePlatId)) setActivePlatId('default');
    setShowSettings(false);
  }

  if (dbError) return (
    <main className="main page-enter">
      <PageHeader breadcrumb={['원가계산', '원가마진표']} title="메뉴 원가마진표" sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>데이터베이스 오류: {dbError}</div>
    </main>
  );

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['원가계산', '원가마진표']}
        title="메뉴 원가마진표"
        sub="레시피 원가 기준 메뉴별 원가율 · 플랫폼·할인 시뮬레이션 지원"
        actions={
          <>
            <button className="btn" onClick={handleSaveSnapshot} disabled={!stats}>
              <Icon.plus style={{ width: 13, height: 13 }}/> 추이 저장
            </button>
            <button className="btn" onClick={() => setShowTrend(true)}>
              <Icon.chart style={{ width: 13, height: 13 }}/> 추이 보기
            </button>
            <button className="btn" onClick={() => exportMarginExcel(filtered, sizeLabels, viewMode, activePlatform, discount)}>
              <Icon.download style={{ width: 13, height: 13 }}/> CSV 내보내기
            </button>
          </>
        }
      />

      <MarginSummaryCards stats={stats} viewMode={viewMode} hasAdjustment={hasAdjustment} />

      <MarginFilterBar
        platforms={platforms}
        activePlatId={activePlatId}
        onPlatId={setActivePlatId}
        onShowSettings={() => setShowSettings(true)}
        discOpen={discOpen}
        onDiscOpen={setDiscOpen}
        discType={discType}
        onDiscType={setDiscType}
        discVal={discVal}
        onDiscVal={setDiscVal}
        discount={discount}
        activePlatform={activePlatform}
        viewMode={viewMode}
        onViewMode={setViewMode}
        cats={cats}
        catFilter={catFilter}
        onCatFilter={setCatFilter}
        search={search}
        onSearch={setSearch}
      />

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: 16 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap"><Icon.doc style={{ width: 32, height: 32 }}/></div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>등록된 메뉴가 없어요</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>원가 계산 탭에서 레시피를 먼저 등록해주세요</div>
        </div>
      ) : (
        <div className="card table-card">
          <div style={{ overflowX:'auto' }}>
            <table className="data-table stagger-rows margin-table">
              <thead>
                {/* 1행: 사이즈 그룹 헤더 — 사이즈마다 원가·판매가·(할인)·율을 한 묶음으로 */}
                <tr className="mt-group">
                  <SortableTh sortKey="name" active={sortKey} dir={sortDir} onClick={handleSort} width={160} rowSpan={2} className="sticky-col">메뉴명</SortableTh>
                  <SortableTh sortKey="cat"  active={sortKey} dir={sortDir} onClick={handleSort} width={90} rowSpan={2}>카테고리</SortableTh>
                  {sizeLabels.map(l => (
                    <th key={l+'_grp'} colSpan={hasAdjustment ? 4 : 3}
                      style={{ textAlign:'center', borderLeft:'2px solid var(--divider)' }}>
                      <span className="chip" style={{ fontSize:11 }}>{l}</span>
                    </th>
                  ))}
                  <th rowSpan={2} style={{ width: 60 }}/>
                </tr>
                {/* 2행: 메트릭 헤더 (정렬) */}
                <tr className="mt-metric">
                  {sizeLabels.map(l => (
                    <Fragment key={l+'_mh'}>
                      <SortableTh sortKey={`cost_${l}`} active={sortKey} dir={sortDir} onClick={handleSort} width={92} right style={{ borderLeft:'2px solid var(--divider)' }}>원가</SortableTh>
                      <SortableTh sortKey={`price_${l}`} active={sortKey} dir={sortDir} onClick={handleSort} width={96} right>판매가</SortableTh>
                      {hasAdjustment && (
                        <SortableTh sortKey={`net_${l}`} active={sortKey} dir={sortDir} onClick={handleSort} width={110} right>
                          <span style={{ color:'var(--accent)' }}>할인적용</span>
                        </SortableTh>
                      )}
                      <SortableTh sortKey={`rate_${l}`} active={sortKey} dir={sortDir} onClick={handleSort} width={92} right>
                        {viewMode === 'margin' ? '마진율' : '원가율'}
                      </SortableTh>
                    </Fragment>
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
            {filtered.length}개 메뉴{rows.length !== filtered.length && ` (전체 ${rows.length}개)`}
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

      {showTrend && (
        <MarginTrendModal onClose={() => setShowTrend(false)} />
      )}
    </main>
  );
}
