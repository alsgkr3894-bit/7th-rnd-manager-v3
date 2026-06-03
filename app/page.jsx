'use client';

const QUICK_NOTE_RESET_MS = 1500;
const devError = (...a) => { if (process.env.NODE_ENV !== 'production') console.error(...a); };

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { useCountUp } from '@/hooks/useCountUp';
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
  getRecentPriceChanges,
} from '@/lib/stats';
import { getIssues } from '@/lib/sales';
import { HomeKpiRow } from '@/components/home/HomeKpiRow';
import { HomeChartRow } from '@/components/home/HomeChartRow';
import { HomeActivities } from '@/components/home/HomeActivities';
import { RankCard, ReportingNotesWidget, SampleStatsWidget, CostAlertWidget, QuickReportWidget } from '@/components/home/HomeWidgets';
import RecentVisitsWidget from '@/components/home/RecentVisitsWidget';
import { NoteHeatmapWidget } from '@/components/home/NoteHeatmapWidget';
import { BriefingWidget } from '@/components/home/BriefingWidget';
import { TodoWidget } from '@/components/home/TodoWidget';
import { UnmatchedWidget } from '@/components/home/UnmatchedWidget';
import { PipelineWidget } from '@/components/home/PipelineWidget';
import { ScheduleWidget } from '@/components/home/ScheduleWidget';
import { PriceChangeWidget } from '@/components/home/PriceChangeWidget';
import { WidgetConfigModal } from '@/components/home/WidgetConfigModal';
import { WidgetShell } from '@/components/home/WidgetShell';
import { useWidgetConfig, HOME_WIDGET_ROWS } from '@/hooks/useWidgetConfig';
import { getAllNotes, addNote } from '@/lib/note';
import { getAllSamples } from '@/lib/sample';
import { KEYS } from '@/lib/note/keys';

/** 시간대별 인사말 */
function greetingByHour() {
  const h = new Date().getHours();
  if (h < 6)  return '늦은 시간까지 고생이 많아요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
}

/** 좌/우 위젯을 row-2b 그리드로 묶음. 한쪽만 있으면 전체 폭 차지. */
function pairRow(a, b, rowKey) {
  if (!a && !b) return null;
  if (a && b) return <div key={rowKey} className="row-2b motion-stagger">{a}{b}</div>;
  return <div key={rowKey} className="row-2b motion-stagger"><div style={{ gridColumn: '1 / -1' }}>{a || b}</div></div>;
}

export default function HomePage() {
  const router = useRouter();

  const [profile, setProfile]       = useState(null);
  const [salesKpi, setSalesKpi]     = useState(null);
  const [costKpi, setCostKpi]       = useState(null);
  const [noteKpi, setNoteKpi]       = useState(null);
  const [trend, setTrend]           = useState(null);
  const [donut, setDonut]           = useState(null);
  const [top, setTop]               = useState([]);
  const [bottom, setBottom]         = useState([]);
  const [activities, setActivities] = useState([]);
  const [reportingNotes, setReportingNotes] = useState([]);
  const [allNotes,       setAllNotes]       = useState([]);
  const [recentSamples,  setRecentSamples]  = useState([]);
  const [costAlertData,  setCostAlertData]  = useState(null);

  // 신규 위젯 데이터
  const [briefing,    setBriefing]    = useState(null);
  const [todos,       setTodos]       = useState([]);
  const [pipeline,    setPipeline]    = useState(null);
  const [weekSchedule, setWeekSchedule] = useState(null);
  const [priceChanges, setPriceChanges] = useState([]);
  const [issues,      setIssues]      = useState([]);

  const [anchor, setAnchor] = useState(null); // {year, month} | null = auto-latest
  const [detectedPeriod, setDetectedPeriod] = useState(null);
  const dbReadyRef = useRef(false);
  const chartTabRef = useRef('month');

  const [chartTab, setChartTab] = useState('month');
  const [chartKey, setChartKey] = useState(0);
  const [hoveredCat, setHoveredCat] = useState(null);

  const [quickNote, setQuickNote]   = useState('');
  const [quickSaved, setQuickSaved] = useState(false);
  const quickResetTimer = useRef(null);

  const {
    isVisible, toggleRow: toggleRowWidget, isCollapsed, toggleCollapse,
    widgetOrder, reorderWidgets,
    favorites, isFavorite, toggleFavorite, favOnly, setFavOnly, effectiveOrder,
  } = useWidgetConfig();
  const [widgetConfigOpen, setWidgetConfigOpen] = useState(false);

  // chartTab ref — useEffect 클로저 stale 방지
  useEffect(() => { chartTabRef.current = chartTab; }, [chartTab]);

  const salesCount = useCountUp(salesKpi?.current ?? 0, { duration: 1400, delay: 250 });
  const noteCount  = useCountUp(noteKpi?.total ?? 0,    { duration: 900,  delay: 460 });

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        dbReadyRef.current = true;
        setProfile(getProfile());
        const settled = await Promise.allSettled([
          getSalesKpi(), getCostRateKpi(), getNoteKpi(),
          getSalesTrend('month'), getCategoryShare(),
          getTopMenusWithTrend(5, '피자', true, 'desc'),
          getTopMenusWithTrend(5, '피자', true, 'asc'),
          getRecentActivities(8), getMonthlyBriefing(),
        ]);
        const [s, c, n, td, dn, tp, bt, ac, br] = settled.map((r, i) => {
          if (r.status === 'rejected') devError(`[Home] 위젯 로드 실패(${i}):`, r.reason);
          return r.status === 'fulfilled' ? r.value : null;
        });
        if (s)  { setSalesKpi(s); setDetectedPeriod({ year: s.year, month: s.month }); }
        if (c)  setCostKpi(c);
        if (n)  setNoteKpi(n);
        if (td) { setTrend(td); setChartKey(k => k + 1); }
        if (dn) setDonut(dn);
        if (tp) setTop(tp);
        if (bt) setBottom(bt);
        if (ac) setActivities(ac);
        if (br) setBriefing(br);

        const settled2 = await Promise.allSettled([
          getAllNotes(), getAllSamples(), getCostAlertData(),
          getTodayTodos(), getPipelineStats(), getWeekSchedule(),
          getRecentPriceChanges(6), getIssues(),
        ]);
        const [an, sm, ca, tdo, pl, ws, pc, iss] = settled2.map(r => r.status === 'fulfilled' ? r.value : null);
        if (an) { setAllNotes(an); setReportingNotes(an.filter(x => x.status === '보고예정')); }
        if (sm) setRecentSamples(sm);
        if (ca) setCostAlertData(ca);
        if (tdo) setTodos(tdo);
        if (pl) setPipeline(pl);
        if (ws) setWeekSchedule(ws);
        if (pc) setPriceChanges(pc);
        if (iss) setIssues(iss);
      } catch (err) {
        devError('[Home] 데이터 로드 실패:', err);
        showToast('데이터를 불러오는 중 문제가 발생했어요. 새로고침해 주세요.', 'error', 5000);
      }
    })();
  }, []);

  useEffect(() => {
    if (!trend) return;
    getSalesTrend(chartTab, anchor)
      .then(t => { setTrend(t); setChartKey(k => k + 1); })
      .catch(err => devError('[Home] 트렌드 로드 실패:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartTab]);

  // anchor(기준 월) 변경 시 판매·브리핑 통계 재조회
  useEffect(() => {
    if (!dbReadyRef.current || !anchor) return;
    const a = anchor;
    Promise.allSettled([
      getSalesKpi(a),
      getSalesTrend(chartTabRef.current, a),
      getCategoryShare(a),
      getTopMenusWithTrend(5, '피자', true, 'desc', a),
      getTopMenusWithTrend(5, '피자', true, 'asc', a),
      getMonthlyBriefing(a),
    ]).then(([s, td, dn, tp, bt, br]) => {
      const val = r => r.status === 'fulfilled' ? r.value : null;
      if (val(s))  setSalesKpi(val(s));
      if (val(td)) { setTrend(val(td)); setChartKey(k => k + 1); }
      if (val(dn)) setDonut(val(dn));
      if (val(tp)) setTop(val(tp));
      if (val(bt)) setBottom(val(bt));
      if (val(br)) setBriefing(val(br));
    }).catch(devError);
  }, [anchor]);

  function shiftAnchor(delta) {
    const base = anchor || detectedPeriod;
    if (!base) return;
    let { year, month } = base;
    month += delta;
    while (month < 1)  { month += 12; year--; }
    while (month > 12) { month -= 12; year++; }
    // 미래 월은 이동 불가
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) return;
    setAnchor({ year, month });
  }

  function openDraftInNoteWrite() {
    const text = quickNote.trim();
    if (!text) return;
    try { sessionStorage.setItem(KEYS.HOME_NOTE_DRAFT, text); } catch (err) { console.warn('[Home] storage access failed:', err); }
    router.push('/note/write');
  }

  async function saveQuickNote() {
    const text = quickNote.trim();
    if (!text) return;
    try {
      await addNote({
        title: text.slice(0, 30), testContent: text,
        menuName: '', status: '아이디어', category: '기타',
      });
      setQuickSaved(true);
      showToast('노트 저장됨 ✓', 'ok');
      getNoteKpi().then(setNoteKpi);
      getRecentActivities(8).then(setActivities);
      if (quickResetTimer.current) clearTimeout(quickResetTimer.current);
      quickResetTimer.current = setTimeout(() => { setQuickNote(''); setQuickSaved(false); }, QUICK_NOTE_RESET_MS);
    } catch (err) {
      devError('[Home] 빠른 메모 저장 실패:', err);
      showToast('저장에 실패했습니다', 'err');
    }
  }

  const userName = profile?.name || '...';
  const isTrendEmpty = useMemo(
    () => trend && trend.thisYear.every(v => v === 0) && trend.lastYear.every(v => v === 0),
    [trend]
  );
  const rankSub = salesKpi == null
    ? '판매 데이터 없음'
    : salesKpi.year && salesKpi.month
      ? `${salesKpi.year}년 ${salesKpi.month}월 · 피자 카테고리`
      : '집계 중';

  const todayStr = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' });

  // 인사말 서브라인
  const alertCount = costAlertData ? costAlertData.items.filter(i => i.costRate > 40).length : 0;
  const greetSub = (todos.length > 0 || alertCount > 0)
    ? <>오늘 챙겨야 할 일 <b>{todos.length}건</b>{alertCount > 0 && <>, 원가율 경보 <b>{alertCount}건</b></>}이 있어요.</>
    : '오늘도 좋은 하루 보내세요.';

  // 표시 여부 (데이터 없으면 null 반환하는 위젯은 미리 거른다)
  const openIssueCount = issues.filter(i => i.status === 'open').length;
  const showUnmatched = isVisible('unmatched') && openIssueCount > 0;
  const showPipeline  = isVisible('pipeline')  && pipeline?.columns?.some(c => c.count > 0);
  const showCostAlert = isVisible('costalert') && (costAlertData?.items?.length ?? 0) > 0;
  const showNotes     = isVisible('notes')     && reportingNotes.length > 0;
  const showSamples   = isVisible('samples')   && recentSamples.length > 0;

  // 렌더 순서: 즐겨찾기 우선(effectiveOrder). 포커스 모드면 즐겨찾기 행만.
  // 즐겨찾기가 0개면 favOnly 무시(빈 대시보드 방지).
  const favSet = new Set(favorites);
  const rowsToRender = (favOnly && favorites.length > 0)
    ? effectiveOrder.filter(id => favSet.has(id))
    : effectiveOrder;

  return (
    <main className="main page-enter">
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
        />
      )}

      {/* 인사말 */}
      <div className="greet" style={{animation:'slide-up 340ms 0ms cubic-bezier(0.2,0.8,0.2,1) both'}}>
        <div>
          <div className="greet-meta">{todayStr}</div>
          <h1>{greetingByHour()}, <span className="accent">{userName}</span>님</h1>
          <div className="sub">{greetSub}</div>
        </div>
        <div className="right">
          {favorites.length > 0 && (
            <button
              className="btn"
              title={favOnly ? '전체 위젯 보기' : '즐겨찾기 위젯만 보기'}
              aria-pressed={favOnly}
              onClick={() => setFavOnly(!favOnly)}
              style={favOnly ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : undefined}
            >
              {favOnly
                ? <Icon.starFill style={{width:15,height:15}}/>
                : <Icon.star style={{width:15,height:15}}/>}
              즐겨찾기만
            </button>
          )}
          <button className="btn" title="위젯 설정" onClick={() => setWidgetConfigOpen(true)}>
            <Icon.gear style={{width:15,height:15}}/>
          </button>
          <button className="btn" onClick={() => router.push('/menu-sales/upload')}>
            <Icon.upload style={{width:16,height:16}} /> 판매량 업로드
          </button>
          <button className="btn primary" onClick={() => router.push('/note/write')}>
            <Icon.plus style={{width:16,height:16}} /> 새 테스트 노트
          </button>
        </div>
      </div>

      {/* 기간 네비게이터 */}
      {detectedPeriod && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, animation:'slide-up 320ms 120ms cubic-bezier(0.2,0.8,0.2,1) both' }}>
          <button className="btn sm" onClick={() => shiftAnchor(-1)} title="이전 달">←</button>
          <span style={{ fontSize:13, color:'var(--text-2)', fontWeight:600, minWidth:96, textAlign:'center' }}>
            {(anchor || detectedPeriod).year}년 {(anchor || detectedPeriod).month}월
          </span>
          <button className="btn sm" onClick={() => shiftAnchor(1)} title="다음 달" disabled={!anchor}>→</button>
          {anchor && (
            <button className="btn sm" style={{ color:'var(--accent)', fontWeight:600 }} onClick={() => setAnchor(null)}>
              최신
            </button>
          )}
        </div>
      )}

      {rowsToRender.map(rowId => {
        switch (rowId) {
          case 'recent':
            return isVisible('recent') ? (
              <WidgetShell key="recent" widgetKey="recent" label="최근 방문" isCollapsed={isCollapsed('recent')} onToggle={toggleCollapse}>
                <RecentVisitsWidget />
              </WidgetShell>
            ) : null;

          case 'briefing':
            return isVisible('briefing') && briefing ? (
              <WidgetShell key="briefing" widgetKey="briefing" label="이번 달 브리핑" isCollapsed={isCollapsed('briefing')} onToggle={toggleCollapse}>
                <BriefingWidget data={briefing} />
              </WidgetShell>
            ) : null;

          case 'kpi':
            return isVisible('kpi') ? (
              <WidgetShell key="kpi" widgetKey="kpi" label="KPI 지표" isCollapsed={isCollapsed('kpi')} onToggle={toggleCollapse}>
                <HomeKpiRow salesKpi={salesKpi} costKpi={costKpi} noteKpi={noteKpi}
                  salesCount={salesCount} noteCount={noteCount}/>
              </WidgetShell>
            ) : null;

          case 'todo-pair':
            return pairRow(
              isVisible('todo')  ? <TodoWidget key="todo" todos={todos} router={router} /> : null,
              showUnmatched      ? <UnmatchedWidget key="unmatched" issues={issues} router={router} /> : null,
              rowId,
            );

          case 'pipeline-pair':
            return pairRow(
              showPipeline           ? <PipelineWidget key="pipeline" data={pipeline} router={router} /> : null,
              isVisible('schedule')  ? <ScheduleWidget key="schedule" data={weekSchedule} router={router} /> : null,
              rowId,
            );

          case 'ranks':
            return isVisible('ranks') ? (
              <div key="ranks" className="row-2b motion-stagger">
                <RankCard title="메뉴 판매 베스트 5" sub={rankSub}
                  items={top} emptyTitle="순위 데이터 없음" accent="up" router={router}/>
                <RankCard title="메뉴 판매 워스트 5" sub={rankSub}
                  items={bottom} emptyTitle="워스트 데이터 없음" accent="down" router={router}/>
              </div>
            ) : null;

          case 'charts':
            return isVisible('charts') ? (
              <WidgetShell key="charts" widgetKey="charts" label="차트 (트렌드 · 카테고리)" isCollapsed={isCollapsed('charts')} onToggle={toggleCollapse}>
                <HomeChartRow
                  trend={trend} donut={donut}
                  hoveredCat={hoveredCat} setHoveredCat={setHoveredCat}
                  chartTab={chartTab} setChartTab={setChartTab}
                  chartKey={chartKey} salesKpi={salesKpi}
                  router={router} isTrendEmpty={isTrendEmpty}
                />
              </WidgetShell>
            ) : null;

          case 'price-pair':
            return pairRow(
              isVisible('pricechange') ? <PriceChangeWidget key="price" items={priceChanges} router={router} /> : null,
              showCostAlert            ? <CostAlertWidget key="costalert" data={costAlertData} router={router} /> : null,
              rowId,
            );

          case 'quicknote':
            return isVisible('quicknote') ? (
              <div key="quicknote" className="card quick-note">
                <div className="quick-note-ico"><Icon.beaker style={{width:18,height:18}}/></div>
                <input className="quick-note-input"
                  placeholder="끝난 테스트 한 줄 메모를 입력하세요"
                  value={quickNote}
                  onChange={e => { setQuickNote(e.target.value); setQuickSaved(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') saveQuickNote(); }}
                />
                <div className="quick-note-hint">
                  {quickSaved
                    ? <span style={{color:'var(--positive)'}}><Icon.check style={{width:14,height:14,verticalAlign:'-2px'}}/> 저장됨</span>
                    : <span><kbd>Enter</kbd>로 저장</span>}
                </div>
                <button className="btn primary sm" disabled={!quickNote.trim()} onClick={openDraftInNoteWrite}>자세히</button>
              </div>
            ) : null;

          case 'notes-pair':
            return pairRow(
              showNotes   ? <ReportingNotesWidget key="notes" notes={reportingNotes} router={router} /> : null,
              showSamples ? <SampleStatsWidget key="samples" samples={recentSamples} router={router} /> : null,
              rowId,
            );

          case 'heat-pair':
            return pairRow(
              isVisible('heatmap')     ? <NoteHeatmapWidget key="heatmap" notes={allNotes} /> : null,
              isVisible('quickreport') ? <QuickReportWidget key="quickreport" router={router} /> : null,
              rowId,
            );

          case 'activities':
            return isVisible('activities') ? (
              <WidgetShell key="activities" widgetKey="activities" label="최근 활동" isCollapsed={isCollapsed('activities')} onToggle={toggleCollapse}>
                <HomeActivities activities={activities} router={router}/>
              </WidgetShell>
            ) : null;

          default: return null;
        }
      })}
    </main>
  );
}
