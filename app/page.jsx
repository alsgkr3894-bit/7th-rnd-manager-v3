'use client';

const QUICK_NOTE_RESET_MS = 1500;
const devError = (...a) => { if (process.env.NODE_ENV !== 'production') console.error(...a); };

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { useCountUp } from '@/lib/useCountUp';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getProfile } from '@/lib/profile';

import {
  getSalesKpi,
  getNoteKpi,
  getCostRateKpi,
  getSalesTrend,
  getCategoryShare,
  getTopMenus,
  getRecentActivities,
  getCostAlertData,
} from '@/lib/stats';
import { HomeKpiRow } from '@/components/home/HomeKpiRow';
import { HomeChartRow } from '@/components/home/HomeChartRow';
import { HomeActivities } from '@/components/home/HomeActivities';
import { RankCard, ReportingNotesWidget, SampleStatsWidget, CostAlertWidget, QuickReportWidget } from '@/components/home/HomeWidgets';
import RecentVisitsWidget from '@/components/home/RecentVisitsWidget';
import { NoteHeatmapWidget } from '@/components/home/NoteHeatmapWidget';
import { WidgetConfigModal } from '@/components/home/WidgetConfigModal';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { getAllNotes, addNote } from '@/lib/note';
import { getAllSamples } from '@/lib/sample';
import { KEYS } from '@/lib/note/keys';


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

  const { isVisible, toggle: toggleWidget } = useWidgetConfig();
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
          getTopMenus(5, '피자', true, 'desc'),
          getTopMenus(5, '피자', true, 'asc'),
          getRecentActivities(8),
        ]);
        const [s, c, n, td, dn, tp, bt, ac] = settled.map(r => r.status === 'fulfilled' ? r.value : null);
        if (s)  { setSalesKpi(s); setDetectedPeriod({ year: s.year, month: s.month }); }
        if (c)  setCostKpi(c);
        if (n)  setNoteKpi(n);
        if (td) { setTrend(td); setChartKey(k => k + 1); }
        if (dn) setDonut(dn);
        if (tp) setTop(tp);
        if (bt) setBottom(bt);
        if (ac) setActivities(ac);
        const [allNotesData, allSamples, costAlert] = await Promise.all([
          getAllNotes(), getAllSamples(), getCostAlertData().catch(() => null),
        ]);
        setAllNotes(allNotesData);
        setReportingNotes(allNotesData.filter(n => n.status === '보고예정'));
        setRecentSamples(allSamples);
        if (costAlert) setCostAlertData(costAlert);
      } catch (err) {
        devError('[Home] 데이터 로드 실패:', err);
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

  // anchor(기준 월) 변경 시 판매 통계 재조회
  useEffect(() => {
    if (!dbReadyRef.current || !anchor) return;
    const a = anchor;
    Promise.allSettled([
      getSalesKpi(a),
      getSalesTrend(chartTabRef.current, a),
      getCategoryShare(a),
      getTopMenus(5, '피자', true, 'desc', a),
      getTopMenus(5, '피자', true, 'asc', a),
    ]).then(([s, td, dn, tp, bt]) => {
      const val = r => r.status === 'fulfilled' ? r.value : null;
      if (val(s))  setSalesKpi(val(s));
      if (val(td)) { setTrend(val(td)); setChartKey(k => k + 1); }
      if (val(dn)) setDonut(val(dn));
      if (val(tp)) setTop(val(tp));
      if (val(bt)) setBottom(val(bt));
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
  const rankSub = salesKpi?.year && salesKpi?.month
    ? `${salesKpi.year}년 ${salesKpi.month}월 · 피자 카테고리`
    : '데이터 없음';

  const todayStr = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' });

  return (
    <main className="main page-enter">
      {/* 위젯 설정 패널 */}
      {widgetConfigOpen && (
        <WidgetConfigModal
          isVisible={isVisible}
          toggle={toggleWidget}
          onClose={() => setWidgetConfigOpen(false)}
        />
      )}

      {/* 인사말 */}
      <div className="greet" style={{animation:'slide-up 340ms 0ms cubic-bezier(0.2,0.8,0.2,1) both'}}>
        <div>
          <div className="greet-meta">{todayStr}</div>
          <h1>안녕하세요, <span className="accent">{userName}</span>님</h1>
          <div className="sub">오늘도 좋은 하루 보내세요.</div>
        </div>
        <div className="right">
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

      {isVisible('recent') && <RecentVisitsWidget />}

      {isVisible('kpi') && (
        <HomeKpiRow salesKpi={salesKpi} costKpi={costKpi} noteKpi={noteKpi}
          salesCount={salesCount} noteCount={noteCount}/>
      )}

      {/* 빠른 메모 */}
      {isVisible('quicknote') && (
        <div className="card quick-note">
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
      )}

      {isVisible('charts') && (
        <HomeChartRow
          trend={trend} donut={donut}
          hoveredCat={hoveredCat} setHoveredCat={setHoveredCat}
          chartTab={chartTab} setChartTab={setChartTab}
          chartKey={chartKey} salesKpi={salesKpi}
          router={router} isTrendEmpty={isTrendEmpty}
        />
      )}

      {/* 베스트 5 + 워스트 5 */}
      {isVisible('ranks') && (
        <div className="mid-row motion-stagger">
          <RankCard title="메뉴 판매 베스트 5" sub={rankSub}
            items={top} emptyTitle="순위 데이터 없음" accent="up" router={router}/>
          <RankCard title="메뉴 판매 워스트 5" sub={rankSub}
            items={bottom} emptyTitle="워스트 데이터 없음" accent="down" router={router}/>
        </div>
      )}

      {/* 원가율 경보 + 보고서 빠른 생성 */}
      {(isVisible('costalert') || isVisible('quickreport')) && (() => {
        const showAlert  = isVisible('costalert') && (costAlertData?.items?.length ?? 0) > 0;
        const showReport = isVisible('quickreport');
        if (!showAlert && !showReport) return null;
        return (
          <div className="mid-row motion-stagger">
            {showAlert  && <CostAlertWidget data={costAlertData} router={router}/>}
            {showReport && (
              <div style={!showAlert ? { gridColumn: '1 / -1' } : {}}>
                <QuickReportWidget router={router}/>
              </div>
            )}
          </div>
        );
      })()}

      {(isVisible('notes') || isVisible('samples')) && (
        <div className="mid-row motion-stagger">
          {isVisible('notes') && <ReportingNotesWidget notes={reportingNotes} router={router}/>}
          {isVisible('samples') && <SampleStatsWidget samples={recentSamples} router={router}/>}
        </div>
      )}

      {isVisible('heatmap') && <NoteHeatmapWidget notes={allNotes} />}

      {isVisible('activities') && <HomeActivities activities={activities} router={router}/>}
    </main>
  );
}
