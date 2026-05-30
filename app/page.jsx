'use client';
import { useEffect, useState, useRef } from 'react';
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
import { getAllNotes, addNote } from '@/lib/note';
import { getAllSamples } from '@/lib/sample';
import { KEYS } from '@/lib/note/keys';

function NoteHeatmapWidget({ notes }) {
  const HEATMAP_WEEKS = 16;
  const HEATMAP_DAYS  = HEATMAP_WEEKS * 7; // 112

  const DAYS  = HEATMAP_DAYS;
  const WEEKS = HEATMAP_WEEKS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 날짜별 count 집계
  const countMap = {};
  notes.forEach(note => {
    const d = note.createdAt ? new Date(note.createdAt) : null;
    if (!d) return;
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((today - d) / 86400000);
    if (diff >= 0 && diff < DAYS) {
      const key = diff;
      countMap[key] = (countMap[key] || 0) + 1;
    }
  });

  const total = Object.values(countMap).reduce((s, v) => s + v, 0);

  // 16주 x 7일 그리드: col 0 = 가장 오래된 주, col 15 = 이번 주
  // row 0 = 일요일, row 6 = 토요일
  const todayDow = today.getDay(); // 0=일 ~ 6=토
  // 오늘이 속한 주의 일요일까지 며칠 전인지
  const daysFromSundayOfThisWeek = todayDow;
  // 전체 시작일: 16주 전 일요일
  const startOffset = DAYS - 1 - (WEEKS - 1) * 7 - daysFromSundayOfThisWeek;
  // startOffset은 today 기준 며칠 전의 일요일

  function getCount(weekIdx, dowIdx) {
    // weekIdx 0 = 가장 오래된 주, 15 = 이번 주
    // dowIdx 0 = 일요일
    const daysAgo = (WEEKS - 1 - weekIdx) * 7 + (todayDow - dowIdx);
    if (daysAgo < 0 || daysAgo >= DAYS) return -1; // 범위 밖 (미래)
    return countMap[daysAgo] || 0;
  }

  function lvClass(count) {
    if (count < 0) return 'lv-none';
    if (count === 0) return 'lv0';
    if (count === 1) return 'lv1';
    if (count === 2) return 'lv2';
    if (count === 3) return 'lv3';
    return 'lv4';
  }

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>노트 작성 현황</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>16주간 {total}개</div>
      </div>
      <div className="heatmap-wrap">
        <div style={{display:'flex',flexDirection:'column',gap:3,marginRight:4,justifyContent:'space-around',height:89}}>
          {['일','','화','','목','','토'].map((d,i) => (
            <div key={i} style={{fontSize:9,color:'var(--text-4)',lineHeight:1,textAlign:'right',width:10}}>{d}</div>
          ))}
        </div>
        <div style={{
          flex:1,
          display: 'grid',
          gridTemplateColumns: `repeat(${WEEKS}, 1fr)`,
          gridTemplateRows: 'repeat(7, 11px)',
          gridAutoFlow: 'column',
          gap: 3,
        }}>
          {Array.from({ length: WEEKS }, (_, wi) =>
            Array.from({ length: 7 }, (_, di) => {
              const c = getCount(wi, di);
              return (
                <div key={`${wi}-${di}`}
                  className={`heatmap-cell ${lvClass(c)}`}
                  title={c >= 0 ? `${c}개` : ''}
                  style={{ gridColumn: wi + 1, gridRow: di + 1, background: c < 0 ? 'transparent' : undefined }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
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

  const [widgetConfig, setWidgetConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEYS.HOME_WIDGETS) || '{}'); } catch { return {}; }
  });
  const [widgetConfigOpen, setWidgetConfigOpen] = useState(false);

  const WIDGET_DEFS = [
    { key: 'kpi',         label: 'KPI 지표' },
    { key: 'quicknote',   label: '빠른 메모' },
    { key: 'charts',      label: '차트 (트렌드 · 카테고리)' },
    { key: 'ranks',       label: '판매 순위 (베스트/워스트)' },
    { key: 'costalert',   label: '원가율 경보' },
    { key: 'quickreport', label: '보고서 빠른 생성' },
    { key: 'notes',       label: '보고예정 노트' },
    { key: 'samples',     label: '샘플 기록' },
    { key: 'heatmap',     label: '노트 히트맵' },
    { key: 'activities',  label: '최근 활동' },
  ];

  function isVisible(key) { return widgetConfig[key] !== false; }

  function toggleWidget(key) {
    const next = { ...widgetConfig, [key]: !isVisible(key) };
    setWidgetConfig(next);
    try { localStorage.setItem(KEYS.HOME_WIDGETS, JSON.stringify(next)); } catch {}
  }

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
        console.error('[Home] 데이터 로드 실패:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!trend) return;
    getSalesTrend(chartTab, anchor)
      .then(t => { setTrend(t); setChartKey(k => k + 1); })
      .catch(err => console.error('[Home] 트렌드 로드 실패:', err));
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
    }).catch(console.error);
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
    try { sessionStorage.setItem(KEYS.HOME_NOTE_DRAFT, text); } catch {}
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
      quickResetTimer.current = setTimeout(() => { setQuickNote(''); setQuickSaved(false); }, 1500);
    } catch (err) {
      console.error('[Home] 빠른 메모 저장 실패:', err);
      showToast('저장에 실패했습니다', 'err');
    }
  }

  const userName = profile?.name || '...';
  const isTrendEmpty = trend && trend.thisYear.every(v => v === 0) && trend.lastYear.every(v => v === 0);
  const rankSub = salesKpi?.year && salesKpi?.month
    ? `${salesKpi.year}년 ${salesKpi.month}월 · 피자 카테고리`
    : '데이터 없음';

  const todayStr = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' });

  return (
    <main className="main page-enter">
      {/* 위젯 설정 패널 */}
      {widgetConfigOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:500,display:'grid',placeItems:'center',animation:'fade 150ms ease'}}
>
          <div className="card modal-anim" style={{width:'min(360px,92vw)',padding:'24px 28px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:15,color:'var(--text-1)'}}>홈 위젯 설정</div>
              <button className="btn" style={{padding:'4px 8px'}} onClick={() => setWidgetConfigOpen(false)}>
                <Icon.close style={{width:15,height:15}}/>
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {WIDGET_DEFS.map(w => (
                <label key={w.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',padding:'6px 0'}}>
                  <span style={{fontSize:14,color:'var(--text-2)'}}>{w.label}</span>
                  <div className="widget-toggle" style={{position:'relative'}}>
                    <input type="checkbox" checked={isVisible(w.key)} onChange={() => toggleWidget(w.key)}
                      style={{position:'absolute',opacity:0,width:0,height:0}}/>
                    <div style={{
                      width:38,height:22,borderRadius:11,
                      background: isVisible(w.key) ? 'var(--accent)' : 'var(--border-strong)',
                      transition:'background .15s',position:'relative',
                    }}>
                      <div style={{
                        position:'absolute',top:3,
                        left: isVisible(w.key) ? 18 : 3,
                        width:16,height:16,borderRadius:8,
                        background:'#fff',transition:'left .15s',
                        boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
                      }}/>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
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
