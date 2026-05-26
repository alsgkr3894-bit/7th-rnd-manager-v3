'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { useCountUp } from '@/lib/useCountUp';
import { showToast } from '@/components/Toast';
import { initDB, put } from '@/lib/db';
import { getProfile } from '@/lib/profile';
import {
  getSalesKpi,
  getNoteKpi,
  getCostRateKpi,
  getSalesTrend,
  getCategoryShare,
  getTopMenus,
  getRecentActivities,
} from '@/lib/stats';
import { fmtKRW } from '@/lib/format';
import { HomeKpiRow } from '@/components/home/HomeKpiRow';
import { HomeChartRow } from '@/components/home/HomeChartRow';
import { HomeActivities } from '@/components/home/HomeActivities';
import { RankCard, ReportingNotesWidget } from '@/components/home/HomeWidgets';
import { getAllNotes } from '@/lib/note';

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

  const [chartTab, setChartTab] = useState('month');
  const [chartKey, setChartKey] = useState(0);
  const [hoveredCat, setHoveredCat] = useState(null);

  const [quickNote, setQuickNote]   = useState('');
  const [quickSaved, setQuickSaved] = useState(false);

  const salesCount = useCountUp(salesKpi?.current ?? 0, { duration: 1400, delay: 250 });
  const noteCount  = useCountUp(noteKpi?.total ?? 0,    { duration: 900,  delay: 460 });

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setProfile(getProfile());
        const [s, c, n, td, dn, tp, bt, ac] = await Promise.all([
          getSalesKpi(), getCostRateKpi(), getNoteKpi(),
          getSalesTrend('month'), getCategoryShare(),
          getTopMenus(5, '피자', true, 'desc'),
          getTopMenus(5, '피자', true, 'asc'),
          getRecentActivities(8),
        ]);
        setSalesKpi(s); setCostKpi(c); setNoteKpi(n);
        setTrend(td); setDonut(dn);
        setTop(tp); setBottom(bt); setActivities(ac);
        const allNotes = await getAllNotes();
        setReportingNotes(allNotes.filter(n => n.status === '보고예정'));
      } catch (err) {
        console.error('[Home] 데이터 로드 실패:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!trend) return;
    getSalesTrend(chartTab).then(t => { setTrend(t); setChartKey(k => k + 1); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartTab]);

  function openDraftInNoteWrite() {
    const text = quickNote.trim();
    if (!text) return;
    try { sessionStorage.setItem('v3:note-draft', text); } catch {}
    router.push('/note/write');
  }

  async function saveQuickNote() {
    const text = quickNote.trim();
    if (!text) return;
    try {
      await put('menu_dev_notes', {
        title: text.slice(0, 30), content: text,
        status: '아이디어', category: '기타',
        createdAt: new Date().toISOString(),
      });
      setQuickSaved(true);
      showToast('노트 저장됨 ✓', 'ok');
      getNoteKpi().then(setNoteKpi);
      getRecentActivities(8).then(setActivities);
      setTimeout(() => { setQuickNote(''); setQuickSaved(false); }, 1500);
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
      {/* 인사말 */}
      <div className="greet" style={{animation:'slide-up 340ms 0ms cubic-bezier(0.2,0.8,0.2,1) both'}}>
        <div>
          <div className="greet-meta">{todayStr}</div>
          <h1>안녕하세요, <span className="accent">{userName}</span>님</h1>
          <div className="sub">오늘도 좋은 하루 보내세요.</div>
        </div>
        <div className="right">
          <button className="btn" onClick={() => router.push('/menu-sales/upload')}>
            <Icon.upload style={{width:16,height:16}} /> 판매량 업로드
          </button>
          <button className="btn primary" onClick={() => router.push('/note/write')}>
            <Icon.plus style={{width:16,height:16}} /> 새 테스트 노트
          </button>
        </div>
      </div>

      <HomeKpiRow salesKpi={salesKpi} costKpi={costKpi} noteKpi={noteKpi}
        salesCount={salesCount} noteCount={noteCount} router={router}/>

      {/* 빠른 메모 */}
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

      <HomeChartRow
        trend={trend} donut={donut}
        hoveredCat={hoveredCat} setHoveredCat={setHoveredCat}
        chartTab={chartTab} setChartTab={setChartTab}
        chartKey={chartKey} salesKpi={salesKpi}
        router={router} isTrendEmpty={isTrendEmpty}
      />

      {/* 베스트 5 + 워스트 5 */}
      <div className="mid-row motion-stagger">
        <RankCard title="메뉴 판매 베스트 5" sub={rankSub}
          items={top} emptyTitle="순위 데이터 없음" accent="up" router={router}/>
        <RankCard title="메뉴 판매 워스트 5" sub={rankSub}
          items={bottom} emptyTitle="워스트 데이터 없음" accent="down" router={router}/>
      </div>

      <ReportingNotesWidget notes={reportingNotes} router={router}/>

      <HomeActivities activities={activities} router={router}/>
    </main>
  );
}
