'use client';
import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePagination } from '@/hooks/usePagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from '@/lib/cost/margin/platforms';
import { MarginFilterBar } from '@/components/cost/margin/MarginFilterBar';
import { MarginSummaryCards } from '@/components/cost/margin/MarginSummaryCards';
import { MarginCostThresholdBar } from '@/components/cost/margin/MarginCostThresholdBar';
import { MarginTableHeader } from '@/components/cost/margin/MarginTableHeader';
import { showToast } from '@/components/Toast';
import { MarginRow } from '@/components/cost/margin/MarginRow';
import { exportMarginExcel } from '@/lib/cost/margin/export';
import { KEYS } from '@/lib/note/keys';
import { useMarginData } from './useMarginData';
import { normalizeWarnPercentSetting, normalizeCritPercentSetting } from './marginPageUtils';
import { useMarginFilters } from './useMarginFilters';
import { useMarginActions } from './useMarginActions';
import { buildMarginTableSections } from './marginTableSections';

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
  });

  // 대량 행(수백+) 렌더 비용을 줄이기 위해 표시만 페이지네이션한다.
  // 내보내기(edgeFiltered)·통계(stats)는 전체 집합 기준이라 영향 없음.
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
            <button className="btn" onClick={handleSaveSnapshot} disabled={!stats}>
              <Icon.plus style={{ width: 13, height: 13 }} /> 추이 저장
            </button>
            <button className="btn" onClick={() => setShowTrend(true)}>
              <Icon.chart style={{ width: 13, height: 13 }} /> 추이 보기
            </button>
            <button
              className="btn"
              onClick={() => {
                try {
                  exportMarginExcel(edgeFiltered, sizeLabels, viewMode, activePlatform, discount);
                } catch (err) {
                  showToast('CSV 출력 실패: ' + (err?.message || '알 수 없는 오류'), 'error');
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
          {sortedFiltered.length === 0 ? (
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
                </tbody>
              </table>
            </div>
          ) : (
            tableSections.map((section, index) => (
              <div
                key={section.id}
                className={`margin-section margin-section-${section.id}`}
                data-first={index === 0 ? 'true' : undefined}
              >
                <div className="margin-section-header">
                  <div className="margin-section-title">
                    <span className="margin-section-marker" aria-hidden="true" />
                    <strong>{section.title}</strong>
                  </div>
                  <div className="margin-section-meta">
                    <span>{section.rows.length}개</span>
                    <span>{section.sizeLabels.join(' / ')}</span>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table stagger-rows margin-table">
                    <thead>
                      <MarginTableHeader
                        sizeLabels={section.sizeLabels}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        hasAdjustment={hasAdjustment}
                        viewMode={viewMode}
                      />
                    </thead>
                    <tbody>
                      {section.rows.map(r => (
                        <MarginRow
                          key={r.id}
                          r={r}
                          sizeLabels={section.sizeLabels}
                          activePlatform={activePlatform}
                          discount={discount}
                          hasAdjustment={hasAdjustment}
                          viewMode={viewMode}
                          warnPct={warnPct}
                          critPct={critPct}
                          onToggleHide={handleToggleHide}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={goTo}
            total={total}
            pageSize={ROW_PAGE_SIZE}
          />
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
