'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { getMenuPriceCategories } from '@/lib/cost/menu-price';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { getMenuMasterMap, upsertMenuMaster } from '@/lib/menu-master';
import {
  savePlatforms,
  applyDiscount,
  calcNetRevenue,
  calcPlatformMargin,
} from '@/lib/cost/margin/platforms';
import { MarginFilterBar } from '@/components/cost/margin/MarginFilterBar';
import { MarginSummaryCards } from '@/components/cost/margin/MarginSummaryCards';
import { MarginCostThresholdBar } from '@/components/cost/margin/MarginCostThresholdBar';
import { MarginTableHeader } from '@/components/cost/margin/MarginTableHeader';
import { saveSnapshot } from '@/lib/cost/margin/snapshots';
import { showToast } from '@/components/Toast';
import { MarginRow } from '@/components/cost/margin/MarginRow';
import { exportMarginExcel } from '@/lib/cost/margin/export';
import { KEYS } from '@/lib/note/keys';
import { useMarginData } from './useMarginData';
import {
  normalizeWarnPercentSetting,
  normalizeCritPercentSetting,
} from './marginPageUtils';

const PlatformSettingsModal = dynamic(
  () => import('@/components/cost/margin/PlatformSettingsModal').then(m => m.PlatformSettingsModal),
  { ssr: false, loading: () => null }
);
const MarginTrendModal = dynamic(
  () => import('@/components/cost/margin/MarginTrendModal').then(m => m.MarginTrendModal),
  { ssr: false, loading: () => null }
);

export default function Page() {
  const { rows, platforms, setPlatforms, loading, dbError, load } = useMarginData();

  const [catFilter, setCatFilter] = useLocalStorage(KEYS.MARGIN_CAT_FILTER, '전체');
  const [activePlatId, setActivePlatId] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [discType, setDiscType] = useState('pct');
  const [discVal, setDiscVal] = useState('');
  const [viewMode, setViewMode] = useState('cost');
  const [sortKey, setSortKey] = useState('code');
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const [warnPct, setWarnPct] = useLocalStorage(KEYS.MARGIN_COST_WARN, 30, normalizeWarnPercentSetting);
  const [critPct, setCritPct] = useLocalStorage(KEYS.MARGIN_COST_CRIT, 40, normalizeCritPercentSetting);
  const [showHidden, setShowHidden] = useState(false);
  const [edgeFilter, setEdgeFilter] = useState(null);

  // 저장된 필터가 현재 행에 없는 카테고리면 '전체'로 되돌림
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
    if (!edgeFiltered.length) return null;
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
        if (m < warnPct) lowCostCount++;
        if (m >= critPct) highCostCount++;
        const margin = 100 - m;
        if (margin >= 100 - warnPct) goodMarginCount++;
        if (margin < 100 - critPct) badMarginCount++;
      }
    }
    if (!count) return null;
    return { avg: sum / count, lowCostCount, highCostCount, goodMarginCount, badMarginCount };
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
      console.error('[CostMargin] save snapshot failed', e);
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

      <MarginCostThresholdBar
        warnPct={warnPct}
        setWarnPct={setWarnPct}
        critPct={critPct}
        setCritPct={setCritPct}
        showHidden={showHidden}
        hiddenCount={hiddenCount}
        setShowHidden={setShowHidden}
      />

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
                <MarginTableHeader
                  sizeLabels={sizeLabels}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  hasAdjustment={hasAdjustment}
                  viewMode={viewMode}
                />
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
