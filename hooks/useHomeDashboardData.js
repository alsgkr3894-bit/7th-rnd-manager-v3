'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getProfile } from '@/lib/profile';
import {
  getSalesKpi,
  getNoteKpi,
  getCostRateKpi,
  getSalesTrend,
  getCategoryShare,
  getTopMenusWithTrend,
  getRecentActivities,
  getCostAlertData,
  getMonthlyBriefing,
  getTodayTodos,
  getPipelineStats,
  getWeekSchedule,
  getMenuCostChanges,
} from '@/lib/stats';
import { getIssues } from '@/lib/sales';
import { getIngredientHealthSummary } from '@/lib/ingredient';
import { getAllNotesCached } from '@/lib/note';
import { getAllSamples } from '@/lib/sample';
import { getActiveBrandId } from '@/lib/active-brand';
import { getUploadFreshness } from '@/lib/stats/upload-status';
import { getBackupReminder } from '@/lib/backup-history';
import { summarizeRefresh } from '@/lib/home/refresh-summary';

const homeRankCategory = () => (getActiveBrandId() === 'main' ? '피자' : null);
const devError = (...a) => {
  if (process.env.NODE_ENV !== 'production') console.error(...a);
};

// chartTab이 변경될 때 트렌드를 다시 불러오기 위해 prop으로 받는다.
export function useHomeDashboardData({ chartTab }) {
  const mountedRef = useMounted();

  const [profile, setProfile] = useState(null);
  const [salesKpi, setSalesKpi] = useState(null);
  const [costKpi, setCostKpi] = useState(null);
  const [noteKpi, setNoteKpi] = useState(null);
  const [trend, setTrend] = useState(null);
  const [donut, setDonut] = useState(null);
  const [top, setTop] = useState([]);
  const [bottom, setBottom] = useState([]);
  const [activities, setActivities] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [recentSamples, setRecentSamples] = useState([]);
  const [costAlertData, setCostAlertData] = useState(null);
  const [menuCostChanges, setMenuCostChanges] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [todos, setTodos] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [weekSchedule, setWeekSchedule] = useState(null);
  const [issues, setIssues] = useState([]);
  const [ingredientHealth, setIngredientHealth] = useState(null);
  const [uploadFreshness, setUploadFreshness] = useState(null);
  const [backupReminder, setBackupReminder] = useState(null);

  const [anchor, setAnchor] = useState(null);
  const [detectedPeriod, setDetectedPeriod] = useState(null);
  const [chartKey, setChartKey] = useState(0);
  // 1차(라이브 위젯)·2차(판매 통계) 조회가 모두 끝났는지 — 끝나기 전에 위젯을 조금씩
  // 끼워 넣으면 아래 내용이 계속 밀려(CLS) 화면이 출렁인다. 페이지는 이 값이 true가 될 때까지
  // 고정 높이 자리표시자를 보여 주고 한 번에 교체한다.
  const [initialLoaded, setInitialLoaded] = useState(false);

  const dbReadyRef = useRef(false);
  const chartTabRef = useRef(chartTab);

  useEffect(() => {
    chartTabRef.current = chartTab;
  }, [chartTab]);

  // 늦게 끝난 이전 기간의 판매 통계가 지금 선택한 기간을 덮지 않게 한다
  const anchorRef = useRef(null);
  useEffect(() => {
    anchorRef.current = anchor;
  }, [anchor]);

  const loadData = useCallback(
    async () => {
      try {
        await initDB();
        if (!mountedRef.current) return;

        dbReadyRef.current = true;
        setProfile(getProfile());

        const live = await Promise.allSettled([
          getAllNotesCached(),
          getAllSamples(),
          getCostAlertData(),
          getTodayTodos(),
          getPipelineStats(),
          getWeekSchedule(),
          getIssues(),
          getRecentActivities(8),
          getCostRateKpi(),
          getNoteKpi(),
          getUploadFreshness(),
          getIngredientHealthSummary(),
          getMenuCostChanges(),
        ]);
        const [an, sm, ca, tdo, pl, ws, iss, ac, c, n, uf, ih, mcc] = live.map(r =>
          r.status === 'fulfilled' ? r.value : null
        );
        if (!mountedRef.current) return;

        if (an) {
          setAllNotes(an);
        }
        if (sm) setRecentSamples(sm);
        if (ca) setCostAlertData(ca);
        if (mcc) setMenuCostChanges(mcc);
        if (tdo) setTodos(tdo);
        if (pl) setPipeline(pl);
        if (ws) setWeekSchedule(ws);
        if (iss) setIssues(iss);
        if (ih) setIngredientHealth(ih);
        if (ac) setActivities(ac);
        if (c) setCostKpi(c);
        if (n) setNoteKpi(n);
        if (uf) setUploadFreshness(uf);
        setBackupReminder(getBackupReminder());

        const results = [...live];
        if (!anchor) {
          const sales = await Promise.allSettled([
            getSalesKpi(),
            getSalesTrend(chartTabRef.current),
            getCategoryShare(),
            getTopMenusWithTrend(5, homeRankCategory(), true, 'desc'),
            getTopMenusWithTrend(5, homeRankCategory(), true, 'asc'),
            getMonthlyBriefing(),
          ]);
          results.push(...sales);
          const [s, td, dn, tp, bt, br] = sales.map(r =>
            r.status === 'fulfilled' ? r.value : null
          );
          if (!mountedRef.current) return;

          if (s) {
            setSalesKpi(s);
            setDetectedPeriod({ year: s.year, month: s.month });
          }
          if (td) {
            setTrend(td);
            setChartKey(k => k + 1);
          }
          if (dn) setDonut(dn);
          if (tp) setTop(tp);
          if (bt) setBottom(bt);
          if (br) setBriefing(br);
        }
        return results;
      } catch (err) {
        if (!mountedRef.current) return;
        devError('[Home] 데이터 로드 실패:', err);
        showToast('데이터를 불러오는 중 문제가 발생했어요. 새로고침해 주세요.', 'error', 5000);
      } finally {
        // 실패해도 자리표시자에 갇히지 않게 — 비어 있는 위젯은 각자 빈 상태를 그린다.
        if (mountedRef.current) setInitialLoaded(true);
      }
    },
    // anchor는 의존성 — anchor 변경 시 판매 데이터 분기 결정
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchor, mountedRef]
  );

  // anchor 기준 판매·브리핑 통계를 읽어 반영하고 조회 결과를 돌려준다.
  const fetchSalesForAnchor = useCallback(async (a, isActive) => {
    const results = await Promise.allSettled([
      getSalesKpi(a),
      getSalesTrend(chartTabRef.current, a),
      getCategoryShare(a),
      getTopMenusWithTrend(5, homeRankCategory(), true, 'desc', a),
      getTopMenusWithTrend(5, homeRankCategory(), true, 'asc', a),
      getMonthlyBriefing(a),
    ]);
    if (!isActive() || !mountedRef.current || anchorRef.current !== a) return results;
    const [s, td, dn, tp, bt, br] = results.map(r => (r.status === 'fulfilled' ? r.value : null));
    if (s) setSalesKpi(s);
    if (td) {
      setTrend(td);
      setChartKey(k => k + 1);
    }
    if (dn) setDonut(dn);
    if (tp) setTop(tp);
    if (bt) setBottom(bt);
    if (br) setBriefing(br);
    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSalesForAnchor = useCallback(
    a => {
      if (!dbReadyRef.current || !a) return () => {};
      let isMounted = true;
      fetchSalesForAnchor(a, () => isMounted).catch(devError);
      return () => {
        isMounted = false;
      };
    },
    [fetchSalesForAnchor]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 새로고침 버튼과 가시성 복귀가 같은 범위를 읽는다 — 라이브 위젯은 loadData로, 기간을 고른 상태면
  // 그 기간의 판매계열도 함께 (loadData는 anchor가 있으면 판매 분기를 건너뛴다).
  const refreshDashboard = useCallback(async () => {
    const live = await loadData();
    if (!live) return { status: 'error' };
    if (!anchor) return summarizeRefresh(live);
    const sales = await fetchSalesForAnchor(anchor, () => true);
    return summarizeRefresh(live, sales);
  }, [loadData, anchor, fetchSalesForAnchor]);
  useVisibilityRefresh(refreshDashboard);

  // chartTab 전환 시 트렌드만 다시 로드 (anchor 기준 유지)
  useEffect(() => {
    if (!trend) return;
    let ignore = false;
    getSalesTrend(chartTab, anchor)
      .then(t => {
        if (!ignore) {
          setTrend(t);
          setChartKey(k => k + 1);
        }
      })
      .catch(err => {
        if (!ignore) devError('[Home] 트렌드 로드 실패:', err);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartTab]);

  // anchor 변경 시 판매·브리핑 통계 재조회 (공유 로더 사용)
  useEffect(() => loadSalesForAnchor(anchor), [anchor, loadSalesForAnchor]);

  function shiftAnchor(delta) {
    const base = anchor || detectedPeriod;
    if (!base) return;
    let { year, month } = base;
    month += delta;
    while (month < 1) {
      month += 12;
      year--;
    }
    while (month > 12) {
      month -= 12;
      year++;
    }
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1))
      return;
    setAnchor({ year, month });
  }

  return {
    profile,
    salesKpi,
    setSalesKpi,
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
    initialLoaded,
    refreshDashboard,
    mountedRef,
  };
}
