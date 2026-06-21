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
} from '@/lib/stats';
import { getIssues } from '@/lib/sales';
import { getIngredientHealthSummary } from '@/lib/ingredient';
import { getAllNotesCached } from '@/lib/note';
import { getAllSamples } from '@/lib/sample';
import { getActiveBrandId } from '@/lib/active-brand';
import { getUploadFreshness } from '@/lib/stats/upload-status';
import { getBackupReminder } from '@/lib/backup-history';

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
  const [reportingNotes, setReportingNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [recentSamples, setRecentSamples] = useState([]);
  const [costAlertData, setCostAlertData] = useState(null);
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

  const dbReadyRef = useRef(false);
  const chartTabRef = useRef(chartTab);

  useEffect(() => {
    chartTabRef.current = chartTab;
  }, [chartTab]);

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
        ]);
        const [an, sm, ca, tdo, pl, ws, iss, ac, c, n, uf, ih] = live.map(r =>
          r.status === 'fulfilled' ? r.value : null
        );
        if (!mountedRef.current) return;

        if (an) {
          setAllNotes(an);
          setReportingNotes(an.filter(x => x.status === '보고예정'));
        }
        if (sm) setRecentSamples(sm);
        if (ca) setCostAlertData(ca);
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

        if (!anchor) {
          const sales = await Promise.allSettled([
            getSalesKpi(),
            getSalesTrend(chartTabRef.current),
            getCategoryShare(),
            getTopMenusWithTrend(5, homeRankCategory(), true, 'desc'),
            getTopMenusWithTrend(5, homeRankCategory(), true, 'asc'),
            getMonthlyBriefing(),
          ]);
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
      } catch (err) {
        if (!mountedRef.current) return;
        devError('[Home] 데이터 로드 실패:', err);
        showToast('데이터를 불러오는 중 문제가 발생했어요. 새로고침해 주세요.', 'error', 5000);
      }
    },
    // anchor는 의존성 — anchor 변경 시 판매 데이터 분기 결정
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchor, mountedRef]
  );

  // anchor 기준 판매·브리핑 통계 로드 — anchor 변경 effect와 가시성 복귀에서 공유한다.
  const loadSalesForAnchor = useCallback(a => {
    if (!dbReadyRef.current || !a) return () => {};
    let isMounted = true;
    Promise.allSettled([
      getSalesKpi(a),
      getSalesTrend(chartTabRef.current, a),
      getCategoryShare(a),
      getTopMenusWithTrend(5, homeRankCategory(), true, 'desc', a),
      getTopMenusWithTrend(5, homeRankCategory(), true, 'asc', a),
      getMonthlyBriefing(a),
    ])
      .then(([s, td, dn, tp, bt, br]) => {
        if (!isMounted || !mountedRef.current) return;
        const val = r => (r.status === 'fulfilled' ? r.value : null);
        if (val(s)) setSalesKpi(val(s));
        if (val(td)) {
          setTrend(val(td));
          setChartKey(k => k + 1);
        }
        if (val(dn)) setDonut(val(dn));
        if (val(tp)) setTop(val(tp));
        if (val(bt)) setBottom(val(bt));
        if (val(br)) setBriefing(val(br));
      })
      .catch(devError);
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 가시성 복귀 시: 라이브 위젯은 loadData로, anchor가 설정된 경우 그 기간의 판매계열도 재조회.
  // (loadData는 anchor가 있으면 판매 분기를 건너뛰므로 별도 갱신 필요)
  const handleVisibilityRefresh = useCallback(() => {
    loadData();
    if (anchor) loadSalesForAnchor(anchor);
  }, [loadData, anchor, loadSalesForAnchor]);
  useVisibilityRefresh(handleVisibilityRefresh);

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
    reportingNotes,
    allNotes,
    recentSamples,
    costAlertData,
    briefing,
    todos,
    pipeline,
    weekSchedule,
    priceChanges: [],
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
  };
}
