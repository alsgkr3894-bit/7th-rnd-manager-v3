'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { Sparkline } from '@/components/charts/Sparkline';
import { AreaChart } from '@/components/charts/AreaChart';
import { Donut } from '@/components/charts/Donut';
import { useCountUp } from '@/lib/useCountUp';
import { showToast } from '@/components/Toast';
import { fmtKRW, formatRelative } from '@/lib/format';
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

export default function HomePage() {
  const router = useRouter();

  // 프로필 + 통계 상태
  const [profile, setProfile] = useState(null);
  const [salesKpi, setSalesKpi] = useState(null);
  const [costKpi, setCostKpi] = useState(null);
  const [noteKpi, setNoteKpi] = useState(null);
  const [trend, setTrend] = useState(null);
  const [donut, setDonut] = useState(null);
  const [top, setTop] = useState([]);
  const [activities, setActivities] = useState([]);

  // 차트 탭 (month | year)
  const [chartTab, setChartTab] = useState('month');
  const [chartKey, setChartKey] = useState(0);
  const [hoveredCat, setHoveredCat] = useState(null);

  // 빠른 메모
  const [quickNote, setQuickNote] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);

  // 카운트업
  const salesCount = useCountUp(salesKpi?.current ?? 0, { duration: 1400, delay: 250 });
  const noteCount  = useCountUp(noteKpi?.total ?? 0,    { duration: 900,  delay: 460 });
  const donutCenter = useCountUp(donut?.total ?? 0,     { duration: 1400, delay: 250 });

  // 초기 로딩
  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setProfile(getProfile());
        const [s, c, n, td, dn, tp, ac] = await Promise.all([
          getSalesKpi(),
          getCostRateKpi(),
          getNoteKpi(),
          getSalesTrend('month'),
          getCategoryShare(),
          getTopMenus(5, '피자', true),
          getRecentActivities(8),
        ]);
        setSalesKpi(s);
        setCostKpi(c);
        setNoteKpi(n);
        setTrend(td);
        setDonut(dn);
        setTop(tp);
        setActivities(ac);
      } catch (err) {
        console.error('[Home] 데이터 로드 실패:', err);
      }
    })();
  }, []);

  // 차트 탭 변경 시 재조회
  useEffect(() => {
    if (!trend) return;
    getSalesTrend(chartTab).then(t => {
      setTrend(t);
      setChartKey(k => k + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartTab]);

  // "자세히" — 입력 중인 텍스트를 노트 작성 페이지로 전달 (sessionStorage 경유)
  function openDraftInNoteWrite() {
    const text = quickNote.trim();
    if (!text) return;
    try { sessionStorage.setItem('v3:note-draft', text); } catch {}
    router.push('/note/write');
  }

  // 빠른 메모 저장 — menu_dev_notes에 즉시 put
  async function saveQuickNote() {
    const text = quickNote.trim();
    if (!text) return;
    try {
      await put('menu_dev_notes', {
        title: text.slice(0, 30),
        content: text,
        status: '아이디어',
        category: '기타',
        createdAt: new Date().toISOString(),
      });
      setQuickSaved(true);
      showToast('노트 저장됨 ✓', 'ok');
      // 노트 KPI / 최근 활동 갱신
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

  return (
    <main className="main page-enter">
      {/* 인사말 */}
      <div className="greet" style={{animation:'slide-up 340ms 0ms cubic-bezier(0.2,0.8,0.2,1) both'}}>
        <div>
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

      {/* 히어로 행 — KPI 3개 */}
      <div className="hero-row motion-stagger">
        {/* KPI 1: 판매량 — 클릭 시 판매량 비교로 이동 */}
        <button className="card kpi-card kpi-clickable" onClick={() => router.push('/menu-sales/rank-compare')} style={kpiButtonStyle}>
          <div>
            <div className="label">
              {salesKpi?.year && salesKpi?.month
                ? `${salesKpi.year}년 ${salesKpi.month}월 판매량`
                : '최근 판매량'}
            </div>
            <div className="value num">{fmtKRW(salesCount)}<span className="unit">개</span></div>
            <div className="trend">
              {salesKpi?.deltaPct == null ? (
                <span style={{color:'var(--text-4)'}}>—</span>
              ) : (
                <>
                  <span className={salesKpi.deltaPct >= 0 ? 'up' : 'down'}>
                    {salesKpi.deltaPct >= 0
                      ? <Icon.arrowUp   style={{width:12,height:12,display:'inline',verticalAlign:'-2px'}}/>
                      : <Icon.arrowDown style={{width:12,height:12,display:'inline',verticalAlign:'-2px'}}/>}
                    {' '}{salesKpi.deltaPct >= 0 ? '+' : ''}{salesKpi.deltaPct.toFixed(1)}%
                  </span>
                  <span style={{color:'var(--text-4)'}}>전월 대비</span>
                </>
              )}
            </div>
          </div>
          <Sparkline data={salesKpi?.sparkline ?? []} color="#3182F6" />
        </button>

        {/* KPI 2: 원가율 — 모듈 미구현이므로 클릭 비활성 */}
        <div className="card kpi-card">
          <div>
            <div className="label">평균 원가율<span className="pill">피자 카테고리</span></div>
            <div className="value num" style={{color: costKpi?.rate == null ? 'var(--text-4)' : undefined}}>
              {costKpi?.rate == null ? '—' : costKpi.rate.toFixed(1)}<span className="unit">%</span>
            </div>
            <div className="trend">
              <span style={{color:'var(--text-4)'}}>원가 모듈 구축 예정</span>
            </div>
          </div>
          <Sparkline data={costKpi?.sparkline ?? []} color="#10B981" />
        </div>

        {/* KPI 3: 노트 — 클릭 시 노트 목록으로 */}
        <button className="card kpi-card kpi-clickable" onClick={() => router.push('/note')} style={kpiButtonStyle}>
          <div>
            <div className="label">진행 중 R&amp;D 노트</div>
            <div className="value num">{noteCount}<span className="unit">건</span></div>
            <div className="trend">
              {noteKpi?.reporting > 0 ? (
                <>
                  <span style={{color:'var(--accent-text)'}}>+{noteKpi.reporting} 보고예정</span>
                  <span style={{color:'var(--text-4)'}}>이번 주</span>
                </>
              ) : (
                <span style={{color:'var(--text-4)'}}>아직 보고예정 없음</span>
              )}
            </div>
          </div>
          <Sparkline data={noteKpi?.sparkline ?? []} color="#3182F6" />
        </button>
      </div>

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

      {/* 차트 행 */}
      <div className="mid-row motion-stagger">
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">메뉴 총 판매량 추이</div>
              <div className="card-sub">
                {chartTab === 'year' ? '연 단위 합산 · 최근 5년' : '월 단위 비교 · 최근 6개월'}
              </div>
            </div>
            <div className="chart-tabs">
              <button className={chartTab==='month'?'active':''} onClick={()=>setChartTab('month')}>월별</button>
              <button className={chartTab==='year'?'active':''} onClick={()=>setChartTab('year')}>년별</button>
            </div>
          </div>
          {isTrendEmpty ? (
            <EmptyState
              icon={<Icon.chart style={{width:32,height:32}}/>}
              title="판매량 데이터가 없습니다"
              desc="메뉴 판매량을 업로드하면 추이가 표시됩니다"
              action="판매량 업로드"
              onAction={() => router.push('/menu-sales/upload')}
            />
          ) : trend ? (
            <>
              <div className="chart-legend">
                {trend.mode === 'year' ? (
                  <span><span className="dot" style={{background:'#3182F6'}}></span>연간 판매량</span>
                ) : (
                  <>
                    <span><span className="dot" style={{background:'#3182F6'}}></span>이번 연도</span>
                    <span><span className="dot" style={{background:'#B0B8C1'}}></span>지난 연도 동월</span>
                  </>
                )}
              </div>
              <AreaChart key={chartKey}
                labels={trend.labels}
                series={trend.mode === 'year'
                  ? [{ name:'연간 판매량', data:trend.thisYear }]
                  : [{ name:'이번 연도', data:trend.thisYear }, { name:'지난 연도', data:trend.lastYear }]}
                colors={trend.mode === 'year' ? ['#3182F6'] : ['#3182F6','#B0B8C1']}
                formatY={(v) => fmtKRW(v) + '개'}
              />
            </>
          ) : (
            <SkeletonChart />
          )}
        </div>

        <div className="card ring-card">
          <div className="card-header">
            <div>
              <div className="card-title">카테고리별 비중</div>
              <div className="card-sub">
                {salesKpi?.year && salesKpi?.month ? `${salesKpi.year}년 ${salesKpi.month}월 기준` : '데이터 없음'}
              </div>
            </div>
            <button className="link" onClick={()=>router.push('/menu-sales/rank')}>자세히</button>
          </div>
          {donut?.total === 0 ? (
            <EmptyState
              icon={<Icon.pizza style={{width:32,height:32}}/>}
              title="데이터 없음"
              desc="판매량을 업로드하면 카테고리 비중이 표시됩니다"
            />
          ) : donut ? (
            <div className="ring-wrap">
              <div className="ring">
                <Donut items={donut.items} onSegmentHover={setHoveredCat} />
                <div className="center">
                  <div className="v num">{fmtKRW(donutCenter)}</div>
                  <div className="l">개</div>
                </div>
              </div>
              <div className="ring-rows">
                {donut.items.map((c,i) => (
                  <div key={c.name} className="ring-row" style={{
                    opacity: hoveredCat !== null && hoveredCat !== i ? 0.4 : 1,
                    transition: 'opacity 200ms ease',
                    fontWeight: hoveredCat === i ? 800 : undefined,
                  }}>
                    <div className="swatch" style={{background:c.color}}></div>
                    <div className="name">{c.name}</div>
                    <div className="v num">{((c.value / donut.total) * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <SkeletonChart />
          )}
        </div>
      </div>

      {/* 하단 행: 순위 + 활동 */}
      <div className="mid-row motion-stagger">
        <div className="card tx-card">
          <div className="card-header">
            <div>
              <div className="card-title">메뉴 판매 순위 TOP 5</div>
              <div className="card-sub">
                {salesKpi?.year && salesKpi?.month ? `${salesKpi.year}년 ${salesKpi.month}월 · 피자 카테고리` : '데이터 없음'}
              </div>
            </div>
            <button className="link accent" onClick={()=>router.push('/menu-sales/rank')}>전체 순위 →</button>
          </div>
          {top.length === 0 ? (
            <EmptyState
              icon={<Icon.chart style={{width:32,height:32}}/>}
              title="순위 데이터 없음"
              desc="판매량 업로드 후 표시됩니다"
              compact
            />
          ) : (
            <div className="rank-list">
              {top.map(r => (
                <button key={r.rank} className="rank-row"
                  onClick={() => router.push(`/menu-sales/rank?menu=${encodeURIComponent(r.name)}`)}
                  style={rowButtonStyle}
                >
                  <div className="rank-num num">{r.rank}</div>
                  <div className="rank-name">{r.name}</div>
                  <Icon.chevRight className="chev" style={{width:16,height:16}}/>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">최근 활동</div><div className="card-sub">업로드 · 노트</div></div>
          </div>
          {activities.length === 0 ? (
            <EmptyState
              icon={<Icon.note style={{width:32,height:32}}/>}
              title="아직 활동 기록이 없습니다"
              desc="업로드 또는 노트 작성 시 여기에 표시됩니다"
              compact
            />
          ) : (
            <div className="tx-list">
              {activities.map((a, i) => {
                const m = ACT_META[a.type] || ACT_META['upload'];
                const href = activityHref(a.type);
                return (
                  <button key={i} className="tx-row"
                    onClick={() => href && router.push(href)}
                    style={{
                      gridTemplateColumns:'36px 1fr 80px 16px', padding:'12px 4px',
                      ...rowButtonStyle,
                      cursor: href ? 'pointer' : 'default',
                    }}
                    disabled={!href}
                  >
                    <div className="ico" style={{background:m.bg,color:m.color}}>{m.ico}</div>
                    <div className="meta">
                      <div className="who" style={{fontSize:13}}>{a.title}</div>
                      {a.sub && <div className="desc">{a.sub}</div>}
                    </div>
                    <div className="acct" style={{fontSize:12,textAlign:'right'}}>{formatRelative(a.when)}</div>
                    <div className="chev"><Icon.chevRight style={{width:12,height:12}}/></div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   하위 컴포넌트 / 상수
============================================================ */

/** button 요소를 카드 스타일로 사용할 때 button 기본 reset */
const kpiButtonStyle = {
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  font: 'inherit',
  width: '100%',
};

/** 리스트 행을 button으로 쓸 때 reset */
const rowButtonStyle = {
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  font: 'inherit',
  width: '100%',
  cursor: 'pointer',
};

/** 활동 타입별 라우팅 경로 (없으면 클릭 비활성) */
function activityHref(type) {
  switch (type) {
    case 'upload-sales': return '/menu-sales/upload';
    case 'upload-jette': return '/jette/price-compare';
    case 'note':         return '/note';
    default:             return null;
  }
}

const ACT_META = {
  'upload-sales': { ico: <Icon.upload style={{width:18,height:18}}/>, color: 'var(--accent-text)', bg: 'var(--accent-soft)' },
  'upload-jette': { ico: <Icon.upload style={{width:18,height:18}}/>, color: '#6B3FCB',            bg: '#F0EBFF' },
  'upload':       { ico: <Icon.upload style={{width:18,height:18}}/>, color: 'var(--text-2)',      bg: 'var(--surface-2)' },
  'note':         { ico: <Icon.beaker style={{width:18,height:18}}/>, color: '#6B3FCB',            bg: '#F0EBFF' },
};

function EmptyState({ icon, title, desc, action, onAction, compact }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding: compact ? '32px 16px' : '48px 24px',
      color:'var(--text-3)', textAlign:'center', gap: 8,
    }}>
      <div style={{color:'var(--text-4)'}}>{icon}</div>
      <div style={{fontSize:14, fontWeight:600, color:'var(--text-2)'}}>{title}</div>
      {desc && <div style={{fontSize:12}}>{desc}</div>}
      {action && (
        <button className="btn primary sm" onClick={onAction} style={{marginTop:8}}>
          {action}
        </button>
      )}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div style={{
      height:180, background:'linear-gradient(90deg, var(--surface-2), var(--border), var(--surface-2))',
      backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite linear', borderRadius:8,
    }}/>
  );
}
