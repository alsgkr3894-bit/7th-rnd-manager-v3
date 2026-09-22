'use client';

const QUICK_NOTE_RESET_MS = 1500;
const devError = (...a) => {
  if (process.env.NODE_ENV !== 'production') console.error(...a);
};

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCountUp } from '@/hooks/useCountUp';
import { showToast } from '@/components/Toast';
import { HomeGreetingBar } from '@/components/home/HomeGreetingBar';
import { HomePeriodNav } from '@/components/home/HomePeriodNav';
import { HomeDashboardRows } from '@/components/home/HomeDashboardRows';
import { WidgetConfigModal } from '@/components/home/WidgetConfigModal';
import { buildGreetingSubline } from '@/components/home/buildGreetingSubline';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { useSettingValue } from '@/hooks/useSettingValue';
import { addNote } from '@/lib/note';
import { KEYS, setHomeNoteDraft } from '@/lib/note/keys';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';
import { getRecentPaletteItems } from '@/lib/palette-recent';
import { getNoteKpi, getRecentActivities } from '@/lib/stats';
import { useHomeDashboardData } from '@/hooks/useHomeDashboardData';
import { ActionCenterWidget } from '@/components/home/ActionCenterWidget';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { normalizeCritPercentSetting } from '@/app/cost/margin/marginPageUtils';

const INITIAL_TODAY_LABEL = '오늘';
const INITIAL_GREETING = '안녕하세요';

/** 시간대별 인사말 */
function greetingByHour() {
  const h = new Date().getHours();
  if (h < 6) return '늦은 시간까지 고생이 많아요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
}

function todayLabel() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export default function HomePage() {
  const router = useRouter();
  const isMain = useIsMainBrand();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const unmatchedAlertEnabled = useSettingValue('unmatchedAlert') !== 'off';
  const costRateAlertEnabled = useSettingValue('costRateAlert') !== 'off';
  const [costAlertCritPct] = useLocalStorage(
    KEYS.MARGIN_COST_CRIT,
    40,
    normalizeCritPercentSetting
  );

  const [chartTab, setChartTab] = useState('month');
  const [hoveredCat, setHoveredCat] = useState(null);
  const [quickNote, setQuickNote] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);
  const [hasRecentVisits, setHasRecentVisits] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayStr, setTodayStr] = useState(INITIAL_TODAY_LABEL);
  const [greeting, setGreeting] = useState(INITIAL_GREETING);
  const quickResetTimer = useRef(null);
  const [widgetConfigOpen, setWidgetConfigOpen] = useState(false);

  const {
    isVisible,
    toggleRow: toggleRowWidget,
    isCollapsed,
    toggleCollapse,
    widgetOrder,
    reorderWidgets,
    favorites,
    isFavorite,
    toggleFavorite,
    favOnly,
    setFavOnly,
    effectiveOrder,
    resetConfig,
  } = useWidgetConfig();

  const {
    profile,
    salesKpi,
    costKpi,
    noteKpi,
    setNoteKpi,
    trend,
    donut,
    top,
    bottom,
    activities,
    setActivities,
    allNotes,
    recentSamples,
    costAlertData,
    briefing,
    todos,
    pipeline,
    weekSchedule,
    menuCostChanges,
    issues,
    ingredientHealth,
    uploadFreshness,
    backupReminder,
    anchor,
    setAnchor,
    detectedPeriod,
    shiftAnchor,
    chartKey,
    loadData,
    mountedRef,
  } = useHomeDashboardData({ chartTab });

  const salesCount = useCountUp(salesKpi?.current ?? 0, { duration: 1400, delay: 250 });
  const noteCount = useCountUp(noteKpi?.total ?? 0, { duration: 900, delay: 460 });

  useEffect(() => {
    setTodayStr(todayLabel());
    setGreeting(greetingByHour());
  }, []);

  useEffect(() => {
    setHasRecentVisits(getRecentPaletteItems().length > 0);
    return () => {
      if (quickResetTimer.current) clearTimeout(quickResetTimer.current);
    };
  }, []);

  function openDraftInNoteWrite() {
    if (!canEdit) {
      showToast('노트 작성은 관리자만 가능합니다', 'warn');
      return;
    }
    const text = quickNote.trim();
    if (!text) return;
    setHomeNoteDraft(text);
    router.push('/note/write');
  }

  async function saveQuickNote() {
    if (!canEdit) {
      showToast('노트 작성은 관리자만 가능합니다', 'warn');
      return;
    }
    const text = quickNote.trim();
    if (!text) return;
    if (text.length > 200) {
      showToast('빠른 메모는 200자 이내로 작성해주세요', 'warn');
      return;
    }
    try {
      await addNote({
        title: text.slice(0, 30),
        testContent: text,
        menuName: '',
        status: '테스트',
        category: '기타',
      });
      if (!mountedRef.current) return;

      setQuickSaved(true);
      showToast('노트 저장됨 ✓', 'ok');
      getNoteKpi()
        .then(v => {
          if (mountedRef.current) setNoteKpi(v);
        })
        .catch(err => devError('[Home] 노트 KPI 갱신 실패:', err));
      getRecentActivities(8)
        .then(v => {
          if (mountedRef.current) setActivities(v);
        })
        .catch(err => devError('[Home] 최근 활동 갱신 실패:', err));
      if (quickResetTimer.current) clearTimeout(quickResetTimer.current);
      quickResetTimer.current = setTimeout(() => {
        setQuickNote('');
        setQuickSaved(false);
      }, QUICK_NOTE_RESET_MS);
    } catch (err) {
      devError('[Home] 빠른 메모 저장 실패:', err);
      showToast('저장에 실패했습니다', 'error');
    }
  }

  const userName = profile?.name || '...';
  const isTrendEmpty = useMemo(
    () => trend && trend.thisYear.every(v => v === 0) && trend.lastYear.every(v => v === 0),
    [trend]
  );
  const rankSub =
    salesKpi == null
      ? '판매 데이터 없음'
      : salesKpi.year && salesKpi.month
        ? `${salesKpi.year}년 ${salesKpi.month}월${isMain ? ' · 피자 카테고리' : ''}`
        : '집계 중';

  // 인사말 서브라인
  const alertIssues = unmatchedAlertEnabled ? issues : [];
  const alertCostAlertData = costRateAlertEnabled
    ? costAlertData
    : { ...(costAlertData || {}), items: [] };
  // 홈 원가율 경보 위젯(CostAlertWidget)·원가마진표와 같은 기준을 공유한다 — 전엔 여기만
  // 40 고정이라, 마진표에서 기준을 바꾸면 인사말 문구의 경보 수와 위젯의 경보 수가 갈렸다.
  const alertCount =
    alertCostAlertData?.items?.filter(i => i.costRate > costAlertCritPct).length ?? 0;
  const noPriceCount = ingredientHealth?.noPriceCount ?? 0;
  const openIssueCount = alertIssues.filter(i => i.status === 'open').length;
  const staleModules = [
    uploadFreshness?.sales?.stale && '판매량',
    isMain && uploadFreshness?.shipment?.stale && '출고량',
    isMain && uploadFreshness?.price?.stale && '단가',
  ].filter(Boolean);
  const greetSub = buildGreetingSubline({
    todosCount: todos.length,
    alertCount,
    openIssueCount,
    noPriceCount,
    staleModules,
    backupReminder,
  });

  // 표시 여부 (데이터 없으면 null 반환하는 위젯은 미리 거른다)
  const showUnmatched = unmatchedAlertEnabled && isVisible('unmatched') && openIssueCount > 0;
  const showPipeline = isVisible('pipeline') && pipeline?.columns?.some(c => c.count > 0);
  const showCostAlert =
    costRateAlertEnabled && isVisible('costalert') && (alertCostAlertData?.items?.length ?? 0) > 0;
  const showSamples = isVisible('samples') && recentSamples.length > 0;

  // 렌더 순서: 즐겨찾기 우선(effectiveOrder). 포커스 모드면 즐겨찾기 행만.
  // 즐겨찾기가 0개면 favOnly 무시(빈 대시보드 방지).
  const favSet = new Set(favorites);
  const rowsToRender =
    favOnly && favorites.length > 0 ? effectiveOrder.filter(id => favSet.has(id)) : effectiveOrder;

  return (
    <main className="main home-main page-enter">
      {/* 위젯 설정 패널 */}
      {widgetConfigOpen && (
        <WidgetConfigModal
          isVisible={isVisible}
          toggleRow={toggleRowWidget}
          onClose={() => setWidgetConfigOpen(false)}
          widgetOrder={widgetOrder}
          onReorder={reorderWidgets}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onReset={resetConfig}
        />
      )}

      <HomeGreetingBar
        todayStr={todayStr}
        greeting={greeting}
        userName={userName}
        greetSub={greetSub}
        favoritesCount={favorites.length}
        favOnly={favOnly}
        onToggleFavOnly={() => setFavOnly(!favOnly)}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          try {
            await loadData();
            showToast('대시보드를 새로고침했어요', 'ok');
          } finally {
            setRefreshing(false);
          }
        }}
        onOpenWidgetConfig={() => setWidgetConfigOpen(true)}
        onUploadSales={() => {
          if (canEdit) router.push('/menu-sales/upload');
        }}
        onNewNote={() => {
          if (canEdit) router.push('/note/write');
        }}
        canEdit={canEdit}
      />

      <HomePeriodNav
        detectedPeriod={detectedPeriod}
        anchor={anchor}
        onShiftAnchor={shiftAnchor}
        onResetAnchor={() => setAnchor(null)}
      />

      <ActionCenterWidget
        unmatchedCount={unmatchedAlertEnabled ? openIssueCount : 0}
        uploadFreshness={uploadFreshness}
        backupReminder={backupReminder}
        ingredientHealth={ingredientHealth}
        costAlertData={costRateAlertEnabled ? costAlertData : null}
        isMain={isMain}
        canEdit={canEdit}
      />

      <HomeDashboardRows
        rowsToRender={rowsToRender}
        isVisible={isVisible}
        hasRecentVisits={hasRecentVisits}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        briefing={briefing}
        salesKpi={salesKpi}
        costKpi={costKpi}
        noteKpi={noteKpi}
        salesCount={salesCount}
        noteCount={noteCount}
        uploadFreshness={uploadFreshness}
        backupReminder={backupReminder}
        isMain={isMain}
        router={router}
        alertIssues={alertIssues}
        alertCostAlertData={alertCostAlertData}
        ingredientHealth={ingredientHealth}
        todos={todos}
        pipeline={pipeline}
        weekSchedule={weekSchedule}
        rankSub={rankSub}
        top={top}
        bottom={bottom}
        trend={trend}
        donut={donut}
        hoveredCat={hoveredCat}
        setHoveredCat={setHoveredCat}
        chartTab={chartTab}
        setChartTab={setChartTab}
        chartKey={chartKey}
        isTrendEmpty={isTrendEmpty}
        menuCostChanges={menuCostChanges}
        showUnmatched={showUnmatched}
        showPipeline={showPipeline}
        showCostAlert={showCostAlert}
        quickNote={quickNote}
        quickSaved={quickSaved}
        canEdit={canEdit}
        onQuickNoteChange={value => {
          setQuickNote(value);
          setQuickSaved(false);
        }}
        onSaveQuickNote={saveQuickNote}
        onOpenQuickNoteDraft={openDraftInNoteWrite}
        showSamples={showSamples}
        recentSamples={recentSamples}
        allNotes={allNotes}
        activities={activities}
      />
    </main>
  );
}
