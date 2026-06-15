'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { getMenuPriceCategories, getAllMenuPrices } from '@/lib/cost/menu-price';
import { PIZZA_CATEGORY_VARIANTS, getMenuCodeRank } from '@/lib/menu-categories';
import { getMenuMasterMap, upsertMenuMaster } from '@/lib/menu-master';
import {
  loadPlatforms,
  savePlatforms,
  applyDiscount,
  calcNetRevenue,
  calcPlatformMargin,
} from '@/lib/cost/margin/platforms';
import { getAllEdges } from '@/lib/cost/edge-dough/store';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { MarginFilterBar } from '@/components/cost/margin/MarginFilterBar';
import { MarginSummaryCards } from '@/components/cost/margin/MarginSummaryCards';
import { saveSnapshot } from '@/lib/cost/margin/snapshots';
import { showToast } from '@/components/Toast';
import { SortableTh } from '@/components/ui/SortableTh';
import { MarginRow } from '@/components/cost/margin/MarginRow';
import { exportMarginExcel } from '@/lib/cost/margin/export';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { onPriceUpload } from '@/lib/price/price-events';
import { KEYS } from '@/lib/note/keys';
import {
  buildDetailRows,
  buildEdgeMetadata,
  buildDerivedRows,
} from '@/lib/cost/margin/build-rows';

const PlatformSettingsModal = dynamic(
  () => import('@/components/cost/margin/PlatformSettingsModal').then(m => m.PlatformSettingsModal),
  { ssr: false, loading: () => null }
);
const MarginTrendModal = dynamic(
  () => import('@/components/cost/margin/MarginTrendModal').then(m => m.MarginTrendModal),
  { ssr: false, loading: () => null }
);

function normalizePercentSetting(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

const normalizeWarnPercentSetting = value => normalizePercentSetting(value, 30);
const normalizeCritPercentSetting = value => normalizePercentSetting(value, 40);

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [catFilter, setCatFilter] = useLocalStorage(KEYS.MARGIN_CAT_FILTER, '전체');
  const [platforms, setPlatforms] = useState([]);
  const [activePlatId, setActivePlatId] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [discType, setDiscType] = useState('pct'); // 'pct' | 'fixed'
  const [discVal, setDiscVal] = useState('');
  const [viewMode, setViewMode] = useState('cost'); // 'cost' | 'margin'
  const [sortKey, setSortKey] = useState('code'); // 기본: 메뉴코드 정렬
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  // 원가율 경고/비상 임계값 (사용자 조절, 마운트 후 localStorage 복원)
  const [warnPct, setWarnPct] = useLocalStorage(
    KEYS.MARGIN_COST_WARN,
    30,
    normalizeWarnPercentSetting
  );
  const [critPct, setCritPct] = useLocalStorage(
    KEYS.MARGIN_COST_CRIT,
    40,
    normalizeCritPercentSetting
  );
  const [showHidden, setShowHidden] = useState(false); // 숨김 행 임시 표시
  const [edgeFilter, setEdgeFilter] = useState(null); // null=전체, 'base'=석쇠기본, 또는 edgeType 문자열

  const load = useCallback(async () => {
    await initDB();
    const [
      files,
      meta,
      allMenuPrices,
      recipeMaps,
      edges,
      masterByCode,
    ] = await Promise.all([
      getPriceFiles(),
      getAllIngredients(),
      getAllMenuPrices(),
      loadMenuRecipeMaps(),
      getAllEdges(),
      getMenuMasterMap(),
    ]);

    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const priceRows = await getPriceRowsByFileId(latest.id);
      priceRowMap = buildPriceRowMap(priceRows).map;
    }
    const upm = buildUnitPriceMap(meta, priceRowMap);

    const detailRows = buildDetailRows(
      allMenuPrices,
      {
        pizzaMap: recipeMaps.pizza,
        personalMap: recipeMaps.personal,
        sideMap: recipeMaps.side,
        setMap: recipeMaps.set,
      },
      upm
    );

    const detailKeySet = new Set(detailRows.map(r => `${r.menuName}||${r.menuCategory}`));
    const PIZZA_EDGE_CATS = new Set(PIZZA_CATEGORY_VARIANTS);
    const pizzaSources = detailRows.filter(r => PIZZA_EDGE_CATS.has(r.menuCategory || ''));

    const edgeMeta = buildEdgeMetadata(edges, allMenuPrices);
    const derivedRows = buildDerivedRows(pizzaSources, edgeMeta, detailKeySet);

    const allRows = [...detailRows, ...derivedRows];
    for (const r of allRows) {
      const m = r.menuCode ? masterByCode.get(r.menuCode) : null;
      r.hidden = m?.hidden === true;
    }
    allRows.sort((a, b) => {
      const ra = getMenuCodeRank(a.menuCode);
      const rb = getMenuCodeRank(b.menuCode);
      if (ra !== rb) return ra - rb;
      return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
    });
    setRows(allRows);
    setPlatforms(loadPlatforms());
  }, []);

  useEffect(() => {
    load()
      .catch(err => {
        console.error(err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => setLoading(false));
  }, [load]);

  useVisibilityRefresh(load);
  useEffect(() => onPriceUpload(load), [load]);

  // 저장된 필터가 현재 행에 없는 카테고리면 '전체'로 되돌림 — 빈 표로 보이는 것 방지
  useEffect(() => {
    if (catFilter === '전체' || !rows.length) return;
    const has = rows.some(r => {
      const cat = r.menuCategory || '기타';
      return cat === catFilter || (catFilter === '피자' && cat.startsWith('피자/'));
    });
    if (!has) setCatFilter('전체');
  }, [catFilter, rows, setCatFilter]);

  const activePlatform = useMemo(
    () =>
      platforms.find(p => p.id === activePlatId) ??
      platforms[0] ?? { id: 'default', name: '기본', fees: [] },
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
    const order = [...getMenuPriceCategories(), '기타'];
    return [
      '전체',
      ...[...set].sort((a, b) => {
        const ia = order.indexOf(a),
          ib = order.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    let result = showHidden ? rows : rows.filter(r => !r.hidden);
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
      result = result.filter(
        r =>
          (r.menuName || '').toLowerCase().includes(q) ||
          (r.menuCategory || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, catFilter, search, showHidden]);

  const edgeFiltered = useMemo(() => {
    if (!edgeFilter) return filtered;
    // 일반 행은 숫자 id, 파생 행만 'derived||...' 문자열 id → String 강제 후 판별
    const isDerived = r => String(r.id ?? '').startsWith('derived||');
    if (edgeFilter === 'base') return filtered.filter(r => !isDerived(r));
    return filtered.filter(r => isDerived(r) && String(r.id).split('||').pop() === edgeFilter);
  }, [filtered, edgeFilter]);

  const sizeLabels = useMemo(() => {
    const set = new Set();
    edgeFiltered.forEach(r =>
      r.sizes?.forEach(s => {
        if (s.label) set.add(s.label);
      })
    );
    const order = ['L', 'R', '단일', '단품', '세트'];
    return [...set].sort((a, b) => {
      const ia = order.indexOf(a),
        ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return ia !== -1 ? -1 : ib !== -1 ? 1 : a.localeCompare(b, 'ko');
    });
  }, [edgeFiltered]);

  const stats = useMemo(() => {
    // edgeFiltered 기준으로 계산 (엣지 필터 포함, 테이블과 일치)
    if (!edgeFiltered.length) return null;
    // Single reduce pass — avoids flatMap+map+filter allocations
    let sum = 0,
      count = 0;
    let lowCostCount = 0,
      highCostCount = 0,
      goodMarginCount = 0,
      badMarginCount = 0;
    for (const r of edgeFiltered) {
      for (const s of r.sizes || []) {
        const cost = r.costMap?.[s.label] || 0;
        const eff = applyDiscount(s.sellingPrice, discount);
        const net = calcNetRevenue(eff, activePlatform.fees, s.label);
        const m = calcPlatformMargin(cost, net);
        if (m == null) continue;
        sum += m;
        count++;
        // cost view: 좋음 = 원가율 < 경고%, 비상 = 원가율 ≥ 비상%
        if (m < warnPct) lowCostCount++;
        if (m >= critPct) highCostCount++;
        // margin view: 좋음 = 마진율 ≥ (100-경고), 위험 = 마진율 < (100-비상)
        const margin = 100 - m;
        if (margin >= 100 - warnPct) goodMarginCount++;
        if (margin < 100 - critPct) badMarginCount++;
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
  }, [edgeFiltered, activePlatform, discount, warnPct, critPct]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return edgeFiltered;

    // 코드 정렬: getMenuCodeRank 기반 (같은 rank 내에서는 코드 문자열 오름차순)
    if (sortKey === 'code') {
      return [...edgeFiltered].sort((a, b) => {
        const ra = getMenuCodeRank(a.menuCode);
        const rb = getMenuCodeRank(b.menuCode);
        if (ra !== rb) return sortDir === 'asc' ? ra - rb : rb - ra;
        const ca = (a.menuCode || '~~~').toLowerCase();
        const cb = (b.menuCode || '~~~').toLowerCase();
        const c = ca.localeCompare(cb, 'ko');
        return sortDir === 'asc' ? c : -c;
      });
    }

    function getVal(r) {
      if (sortKey === 'name') return (r.menuName || '').toLowerCase();
      if (sortKey === 'cat') return (r.menuCategory || '기타').toLowerCase();
      const ul = sortKey.lastIndexOf('_');
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

    return [...edgeFiltered].sort((a, b) => {
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
  }, [edgeFiltered, sortKey, sortDir, discount, activePlatform, viewMode]);

  async function handleSaveSnapshot() {
    if (!stats) {
      showToast('집계할 메뉴 데이터가 없어요', 'error');
      return;
    }
    const avgCostRate = stats.avg;
    const avgMargin = 100 - avgCostRate;
    const menuCount = edgeFiltered.length;
    const label = catFilter !== '전체' ? catFilter : '전체 메뉴';
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
    showToast('플랫폼 설정 저장됨', 'ok');
  }

  // 행 숨김 토글 — 메뉴 마스터의 hidden 플래그로 저장(표·통계에서 제외)
  const handleToggleHide = useCallback(
    async r => {
      if (!r.menuCode) return;
      try {
        const map = await getMenuMasterMap();
        const existing = map.get(r.menuCode);
        if (!existing) {
          showToast('마스터에 없는 메뉴라 숨길 수 없어요', 'error');
          return;
        }
        await upsertMenuMaster({ ...existing, hidden: !r.hidden });
        await load();
      } catch (e) {
        showToast('숨김 처리 실패: ' + e.message, 'error');
      }
    },
    [load]
  );

  const hiddenCount = useMemo(() => rows.filter(r => r.hidden).length, [rows]);

  if (loading)
    return (
      <main className="main page-enter">
        <PageHeader
          breadcrumb={['원가계산', '원가마진표']}
          title="메뉴 원가마진표"
          sub="로딩 중…"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 44,
                borderRadius: 8,
                background: 'var(--surface-2)',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>
      </main>
    );

  if (dbError)
    return (
      <main className="main page-enter">
        <PageHeader
          breadcrumb={['원가계산', '원가마진표']}
          title="메뉴 원가마진표"
          sub="로드 실패"
        />
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}
        >
          데이터베이스 오류: {dbError}
        </div>
      </main>
    );

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['원가계산', '원가마진표']}
        title="메뉴 원가마진표"
        masterSource
        sub="레시피 원가 기준 메뉴별 원가율 · 플랫폼·할인 시뮬레이션 지원"
        actions={
          <>
            <button className="btn" onClick={handleSaveSnapshot} disabled={!stats}>
              <Icon.plus style={{ width: 13, height: 13 }} /> 추이 저장
            </button>
            <button className="btn" onClick={() => setShowTrend(true)}>
              <Icon.chart style={{ width: 13, height: 13 }} /> 추이 보기
            </button>
            <button
              className="btn"
              onClick={() =>
                exportMarginExcel(edgeFiltered, sizeLabels, viewMode, activePlatform, discount)
              }
            >
              <Icon.download style={{ width: 13, height: 13 }} /> 엑셀로 내보내기
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
        edgeFilter={edgeFilter}
        onEdgeFilter={setEdgeFilter}
        search={search}
        onSearch={setSearch}
      />

      {/* 원가율 경고/비상 임계값 + 숨김 보기 */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          flexWrap: 'wrap',
          margin: '2px 0 10px',
          fontSize: 12,
          color: 'var(--text-3)',
        }}
      >
        <span style={{ fontWeight: 700 }}>원가율 경고선</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          경고 ≥
          <input
            type="number"
            min={0}
            max={100}
            value={warnPct}
            onChange={e => setWarnPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            style={{
              width: 56,
              padding: '3px 6px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
            }}
          />
          %
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          비상 ≥
          <input
            type="number"
            min={0}
            max={100}
            value={critPct}
            onChange={e => setCritPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
            style={{
              width: 56,
              padding: '3px 6px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
            }}
          />
          %
        </label>
        {hiddenCount > 0 && (
          <button
            className="btn sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowHidden(v => !v)}
          >
            {showHidden ? '숨김 행 감추기' : `숨김 ${hiddenCount}개 보기`}
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 44, borderRadius: 8, marginBottom: 8 }}
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Icon.doc style={{ width: 32, height: 32 }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>등록된 메뉴가 없어요</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            원가 계산 탭에서 레시피를 먼저 등록해주세요
          </div>
        </div>
      ) : (
        <div className="card table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table stagger-rows margin-table">
              <thead>
                {/* 1행: 사이즈 그룹 헤더 — 사이즈마다 원가·판매가·(할인)·율을 한 묶음으로 */}
                <tr className="mt-group">
                  <SortableTh
                    sortKey="name"
                    active={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                    width={160}
                    rowSpan={2}
                    className="sticky-col"
                  >
                    메뉴명
                  </SortableTh>
                  <SortableTh
                    sortKey="cat"
                    active={sortKey}
                    dir={sortDir}
                    onClick={handleSort}
                    width={90}
                    rowSpan={2}
                  >
                    카테고리
                  </SortableTh>
                  {sizeLabels.map(l => (
                    <th
                      key={l + '_grp'}
                      colSpan={hasAdjustment ? 4 : 3}
                      style={{ textAlign: 'center', borderLeft: '2px solid var(--divider)' }}
                    >
                      <span className="chip" style={{ fontSize: 11 }}>
                        {l}
                      </span>
                    </th>
                  ))}
                  <th rowSpan={2} style={{ width: 60 }} />
                </tr>
                {/* 2행: 메트릭 헤더 (정렬) */}
                <tr className="mt-metric">
                  {sizeLabels.map(l => (
                    <Fragment key={l + '_mh'}>
                      <SortableTh
                        sortKey={`cost_${l}`}
                        active={sortKey}
                        dir={sortDir}
                        onClick={handleSort}
                        width={92}
                        right
                        style={{ borderLeft: '2px solid var(--divider)' }}
                      >
                        원가
                      </SortableTh>
                      <SortableTh
                        sortKey={`price_${l}`}
                        active={sortKey}
                        dir={sortDir}
                        onClick={handleSort}
                        width={96}
                        right
                      >
                        판매가
                      </SortableTh>
                      {hasAdjustment && (
                        <SortableTh
                          sortKey={`net_${l}`}
                          active={sortKey}
                          dir={sortDir}
                          onClick={handleSort}
                          width={110}
                          right
                        >
                          <span style={{ color: 'var(--accent)' }}>할인적용</span>
                        </SortableTh>
                      )}
                      <SortableTh
                        sortKey={`rate_${l}`}
                        active={sortKey}
                        dir={sortDir}
                        onClick={handleSort}
                        width={92}
                        right
                      >
                        {viewMode === 'margin' ? '마진율' : '원가율'}
                      </SortableTh>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={99}
                      style={{
                        padding: '32px 0',
                        textAlign: 'center',
                        color: 'var(--text-3)',
                        fontSize: 13,
                      }}
                    >
                      조건에 맞는 메뉴가 없습니다
                    </td>
                  </tr>
                ) : (
                  sortedFiltered.map(r => (
                    <MarginRow
                      key={r.id}
                      r={r}
                      sizeLabels={sizeLabels}
                      activePlatform={activePlatform}
                      discount={discount}
                      hasAdjustment={hasAdjustment}
                      viewMode={viewMode}
                      warnPct={warnPct}
                      critPct={critPct}
                      onToggleHide={handleToggleHide}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div
            style={{
              padding: '8px 16px',
              fontSize: 11,
              color: 'var(--text-3)',
              borderTop: '1px solid var(--divider)',
            }}
          >
            {edgeFiltered.length}개 메뉴
            {rows.length !== edgeFiltered.length && ` (전체 ${rows.length}개)`}
            {hasAdjustment && (
              <span style={{ marginLeft: 8, color: 'var(--accent)' }}>
                · {activePlatform.id !== 'default' ? activePlatform.name : ''}
                {activePlatform.id !== 'default' && discount ? ' + ' : ''}
                {discount
                  ? discType === 'pct'
                    ? `${discount.value}% 할인`
                    : `${formatNumber(discount.value)}원 할인`
                  : ''}{' '}
                적용 중
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

      {showTrend && <MarginTrendModal onClose={() => setShowTrend(false)} />}
    </main>
  );
}
