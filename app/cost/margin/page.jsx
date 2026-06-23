'use client';
import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePagination } from '@/hooks/usePagination';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from '@/lib/cost/margin/platforms';
import { MarginFilterBar } from '@/components/cost/margin/MarginFilterBar';
import { MarginSummaryCards } from '@/components/cost/margin/MarginSummaryCards';
import { MarginCostThresholdBar } from '@/components/cost/margin/MarginCostThresholdBar';
import { exportMarginExcel } from '@/lib/cost/margin/export';
import { KEYS } from '@/lib/note/keys';
import { useMarginData } from './useMarginData';
import { normalizeWarnPercentSetting, normalizeCritPercentSetting } from './marginPageUtils';
import { useMarginFilters } from './useMarginFilters';
import { useMarginActions } from './useMarginActions';
import { buildMarginTableSections } from './marginTableSections';
import { MarginTableCard } from './_MarginTableCard';

const ROW_PAGE_SIZE = 60;

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
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;

  const [activePlatId, setActivePlatId] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [discType, setDiscType] = useState('pct');
  const [discVal, setDiscVal] = useState('');
  const [viewMode, setViewMode] = useState('cost');
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

  const {
    catFilter,
    setCatFilter,
    sortKey,
    sortDir,
    search,
    setSearch,
    showHidden,
    setShowHidden,
    edgeFilter,
    setEdgeFilter,
    cats,
    edgeFiltered,
    sizeLabels,
    stats,
    handleSort,
    sortedFiltered,
    hiddenCount,
  } = useMarginFilters({ rows, activePlatform, discount, warnPct, critPct, viewMode });

  const { handleSaveSnapshot, handleSavePlatforms, handleToggleHide } = useMarginActions({
    stats,
    edgeFiltered,
    catFilter,
    load,
    setPlatforms,
    activePlatId,
    setActivePlatId,
    setShowSettings,
    canEdit,
  });

  const { page, goTo, totalPages, paged, total } = usePagination(sortedFiltered, ROW_PAGE_SIZE);
  const tableSections = useMemo(() => buildMarginTableSections(paged), [paged]);

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
            <button className="btn" onClick={handleSaveSnapshot} disabled={!stats || !canEdit}>
              <Icon.plus style={{ width: 13, height: 13 }} /> 추이 저장
            </button>
            <button className="btn" onClick={() => setShowTrend(true)}>
              <Icon.chart style={{ width: 13, height: 13 }} /> 추이 보기
            </button>
            <button
              className="btn"
              onClick={async () => {
                try {
                  await exportMarginExcel(edgeFiltered, sizeLabels, viewMode, activePlatform, discount);
                } catch (err) {
                  showToast('엑셀 출력 실패: ' + (err?.message || '알 수 없는 오류'), 'error');
                }
              }}
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

      <MarginTableCard
        rows={rows}
        sortedFiltered={sortedFiltered}
        edgeFiltered={edgeFiltered}
        tableSections={tableSections}
        sortKey={sortKey}
        sortDir={sortDir}
        sizeLabels={sizeLabels}
        hasAdjustment={hasAdjustment}
        viewMode={viewMode}
        warnPct={warnPct}
        critPct={critPct}
        activePlatform={activePlatform}
        discount={discount}
        discType={discType}
        discVal={discVal}
        onSort={handleSort}
        onToggleHide={handleToggleHide}
        canEdit={canEdit}
        page={page}
        goTo={goTo}
        totalPages={totalPages}
        total={total}
        pageSize={ROW_PAGE_SIZE}
      />

      {showSettings && (
        <PlatformSettingsModal
          platforms={platforms}
          onSave={handleSavePlatforms}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showTrend && <MarginTrendModal onClose={() => setShowTrend(false)} canEdit={canEdit} />}
    </main>
  );
}
