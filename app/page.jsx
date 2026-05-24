'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { Sparkline } from '@/components/charts/Sparkline';
import { AreaChart } from '@/components/charts/AreaChart';
import { Donut } from '@/components/charts/Donut';
import { useCountUp } from '@/lib/useCountUp';
import { showToast } from '@/components/Toast';
import { fmtKRW } from '@/lib/fmt';
import { CHART_DATA, DONUT_CATS } from '@/lib/data';

export default function HomePage() {
  const router = useRouter();
  const [chartTab, setChartTab] = useState('month');
  const [chartKey, setChartKey] = useState(0);
  const [quickNote, setQuickNote] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);
  const [hoveredCat, setHoveredCat] = useState(null);

  const handleTabChange = (tab) => { setChartTab(tab); setChartKey(k => k + 1); };

  const salesCount    = useCountUp(184320, { duration: 1400, delay: 250 });
  const costRateCount = useCountUp(29.4,   { duration: 1100, delay: 360, decimals: 1 });
  const notesCount    = useCountUp(17,     { duration: 900,  delay: 460 });
  const donutCenter   = useCountUp(184320, { duration: 1400, delay: 250 });

  const d = CHART_DATA[chartTab];

  const ranks = [
    { rank: 1, name: '슈퍼콤비네이션' },
    { rank: 2, name: '치즈크러스트' },
    { rank: 3, name: '페퍼로니 추가' },
    { rank: 4, name: '골드스윗크러스트' },
    { rank: 5, name: '치즈 추가' },
  ];

  const activities = [
    { type: 'price-up',   when: '방금 전',  title: '모짜렐라치즈 부가세포함단가 +3.8%',    sub: '7,400원 → 7,680원 · 영향 메뉴 23개' },
    { type: 'upload',     when: '1시간 전', title: '메뉴판매량 4월 데이터 업로드',          sub: '12,840건 처리 · 미매칭 4건' },
    { type: 'note',       when: '3시간 전', title: '횡성한우쉬림프 테스트 노트',            sub: '와사비마요 조합 · 235도 4분 50초' },
    { type: 'price-down', when: '어제',     title: '양파 부가세포함단가 -5.2%',            sub: '2,100원 → 1,990원 · 영향 메뉴 18개' },
    { type: 'report',     when: '어제',     title: '4월 판매량 보고서 생성 완료',           sub: '전월 대비 +6.8% · 보고용 요약 첨부' },
  ];

  const actMeta = {
    'price-up':   { ico: <Icon.arrowUp   style={{width:18,height:18}}/>, color: 'var(--negative)',    bg: 'var(--negative-soft)' },
    'price-down': { ico: <Icon.arrowDown style={{width:18,height:18}}/>, color: 'var(--positive)',    bg: 'var(--positive-soft)' },
    'upload':     { ico: <Icon.upload    style={{width:18,height:18}}/>, color: 'var(--accent-text)', bg: 'var(--accent-soft)' },
    'note':       { ico: <Icon.beaker   style={{width:18,height:18}}/>, color: '#6B3FCB',             bg: '#F0EBFF' },
    'report':     { ico: <Icon.doc      style={{width:18,height:18}}/>, color: 'var(--text-2)',       bg: 'var(--surface-2)' },
  };

  return (
    <main className="main page-enter">
      {/* 인사말 */}
      <div className="greet" style={{animation:'slide-up 340ms 0ms cubic-bezier(0.2,0.8,0.2,1) both'}}>
        <div>
          <h1>안녕하세요, <span className="accent">민혁 책임</span>님</h1>
          <div className="sub">오늘은 새로운 단가 변동 2건과 미확인 미매칭 메뉴 4건이 있어요.</div>
        </div>
        <div className="right">
          <button className="btn" onClick={() => showToast('파일을 선택해주세요 (데모)', 'info')}>
            <Icon.upload style={{width:16,height:16}} /> 제때판매가 업로드
          </button>
          <button className="btn primary" onClick={() => router.push('/note/write')}>
            <Icon.plus style={{width:16,height:16}} /> 새 테스트 노트
          </button>
        </div>
      </div>

      {/* 히어로 행 */}
      <div className="hero-row motion-stagger">
        <div className="card balance-card">
          <div className="hero-dots" />
          <div className="eyebrow"><Icon.chart style={{width:14,height:14}} /> 이번 달 누적 판매량</div>
          <div className="acct">2026년 5월 · 5월 1일 ~ 5월 22일 기준</div>
          <div className="amount num">{fmtKRW(salesCount)}<span className="unit">개</span></div>
          <div className="delta"><Icon.arrowUp style={{width:14,height:14}} /> 전월 동기 대비 +6.8% (11,720개)</div>
          <div className="actions">
            <button className="btn dark-onlight primary" onClick={() => router.push('/menu-sales/rank')}>
              메뉴별 보기 <Icon.chevRight style={{width:14,height:14}} />
            </button>
            <button className="btn dark-onlight" onClick={() => showToast('CSV 파일이 저장됐어요', 'ok')}>CSV 내보내기</button>
          </div>
        </div>

        <div className="card kpi-card">
          <div>
            <div className="label">평균 원가율<span className="pill">피자 카테고리</span></div>
            <div className="value num">{costRateCount.toFixed(1)}<span className="unit">%</span></div>
            <div className="trend">
              <span className="up"><Icon.arrowDown style={{width:12,height:12,display:'inline',verticalAlign:'-2px'}}/> -0.6%p</span>
              <span style={{color:'var(--text-4)'}}>전월 대비</span>
            </div>
          </div>
          <Sparkline data={[31.2,30.8,31.5,30.4,30.1,29.8,29.4]} color="#10B981" />
        </div>

        <div className="card kpi-card">
          <div>
            <div className="label">진행 중 R&amp;D 노트</div>
            <div className="value num">{notesCount}<span className="unit">건</span></div>
            <div className="trend">
              <span style={{color:'var(--accent-text)'}}>+4 보고예정</span>
              <span style={{color:'var(--text-4)'}}>이번 주</span>
            </div>
          </div>
          <Sparkline data={[8,10,9,12,13,15,17]} color="#3182F6" />
        </div>
      </div>

      {/* 상태 행 */}
      <div className="status-row motion-stagger">
        {/* 데이터 정합성 */}
        <div className="card status-card">
          <div className="card-header" style={{marginBottom:8}}>
            <div>
              <div className="card-title">데이터 정합성</div>
              <div className="card-sub">오계산 방지를 위한 확인 항목</div>
            </div>
            <span className="chip" style={{background:'var(--warn-soft)',color:'var(--warn)'}}>조치 필요 6건</span>
          </div>
          <div className="status-list">
            {[
              { label:'단가 미연동 품목', desc:'최신 제때 단가와 매칭 안 됨', n:2, bg:'var(--warn-soft)', c:'var(--warn)' },
              { label:'미매칭 메뉴',      desc:'판매 데이터와 메뉴명 불일치',   n:4, bg:'var(--negative-soft)', c:'var(--negative)' },
              { label:'단위 확인 필요',   desc:'세부 원가표 사용 단위 불일치',  n:0, bg:'var(--accent-soft)', c:'var(--accent-text)' },
            ].map((item,i) => (
              <button key={i} className="status-item" onClick={() => router.push('/menu-sales/unmatched')}>
                <div className="status-ico" style={{background:item.bg,color:item.c}}><Icon.alert style={{width:16,height:16}}/></div>
                <div className="status-meta"><div className="status-name">{item.label}</div><div className="status-desc">{item.desc}</div></div>
                <div className="status-val num">{item.n}</div>
                <Icon.chevRight className="chev" style={{width:14,height:14}}/>
              </button>
            ))}
          </div>
        </div>

        {/* 이번 주 액션 */}
        <div className="card status-card">
          <div className="card-header" style={{marginBottom:8}}>
            <div><div className="card-title">이번 주 액션</div><div className="card-sub">보고 · 재테스트 · 마감임박</div></div>
            <button className="link accent">전체 →</button>
          </div>
          <div className="status-list">
            {[
              { label:'보고예정 노트', desc:'황성한우셰림프 외 2건', n:3, ico:<Icon.note style={{width:16,height:16}}/>, bg:'#F0EBFF', c:'#6B3FCB', href:'/note' },
              { label:'재테스트 대기', desc:'이번 주 내 테스트 예정', n:5, ico:<Icon.beaker style={{width:16,height:16}}/>, bg:'var(--warn-soft)', c:'var(--warn)', href:'/note' },
              { label:'보고서 마감임박', desc:'5월 판매량 보고서 · D-2', n:1, ico:<Icon.doc style={{width:16,height:16}}/>, bg:'var(--accent-soft)', c:'var(--accent-text)', href:'/report/sales' },
            ].map((item,i) => (
              <button key={i} className="status-item" onClick={() => router.push(item.href)}>
                <div className="status-ico" style={{background:item.bg,color:item.c}}>{item.ico}</div>
                <div className="status-meta"><div className="status-name">{item.label}</div><div className="status-desc">{item.desc}</div></div>
                <div className="status-val num">{item.n}</div>
                <Icon.chevRight className="chev" style={{width:14,height:14}}/>
              </button>
            ))}
          </div>
        </div>

        {/* 원가율 위험 */}
        <div className="card status-card">
          <div className="card-header" style={{marginBottom:8}}>
            <div><div className="card-title">원가율 위험 메뉴</div><div className="card-sub">35% 초과 · 단가 인상 영향</div></div>
            <span className="chip" style={{background:'var(--negative-soft)',color:'var(--negative)'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'var(--negative)',display:'inline-block'}}></span> 주의
            </span>
          </div>
          <div className="risk-list">
            {[
              { name:'포테이토피자 L', rate:38.2, delta:2.1,  reason:'치즈 단가 인상' },
              { name:'고르곤졸라 L',   rate:36.8, delta:1.4,  reason:'고르곤졸라 인상' },
              { name:'새우파티 L',     rate:35.5, delta:0.6,  reason:'새우 단가 인상' },
            ].map((r,i) => (
              <button className="risk-row" key={i} onClick={() => {
                router.push('/cost/pizza-summary');
                showToast(`${r.name} 원가표로 이동`, 'info');
              }}>
                <div className="risk-name">{r.name}</div>
                <div className="risk-rate num">{r.rate}<span className="unit">%</span></div>
                <div className="risk-reason">{r.reason}</div>
                <div className="risk-delta" style={{color:'var(--negative)'}}>▲ {r.delta}%p</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 빠른 노트 */}
      <div className="card quick-note">
        <div className="quick-note-ico"><Icon.beaker style={{width:18,height:18}}/></div>
        <input className="quick-note-input"
          placeholder="끝난 테스트 한 줄 메모 — 예: 황성한우셰림프 와사비마요 235°4분50초 · 감칠한 맛"
          value={quickNote}
          onChange={e => { setQuickNote(e.target.value); setQuickSaved(false); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && quickNote.trim()) {
              setQuickSaved(true);
              showToast('노트 저장됨 ✓', 'ok');
              setTimeout(() => { setQuickNote(''); setQuickSaved(false); }, 1500);
            }
          }}
        />
        <div className="quick-note-hint">
          {quickSaved
            ? <span style={{color:'var(--positive)'}}><Icon.check style={{width:14,height:14,verticalAlign:'-2px'}}/> 저장됨</span>
            : <span><kbd>Enter</kbd>로 저장</span>}
        </div>
        <button className="btn primary sm" disabled={!quickNote.trim()} onClick={() => router.push('/note/write')}>자세히</button>
      </div>

      {/* 빠른 작업 */}
      <div className="card flat" style={{padding:0}}>
        <div className="quick quick-5">
          {[
            { ico:<Icon.upload style={{width:22,height:22}}/>,  label:'제때 판매가 업로드', cls:'',       onClick:()=>showToast('파일을 선택해주세요 (데모)','info') },
            { ico:<Icon.note style={{width:22,height:22}}/>,    label:'노트 작성',          cls:'purple',  onClick:()=>router.push('/note/write') },
            { ico:<Icon.doc style={{width:22,height:22}}/>,     label:'보고서 생성',        cls:'pink',    onClick:()=>router.push('/report') },
            { ico:<Icon.calc style={{width:22,height:22}}/>,    label:'원가 계산',          cls:'orange',  onClick:()=>router.push('/cost/pizza-summary') },
            { ico:<Icon.download style={{width:22,height:22}}/>,label:'데이터 백업',        cls:'gray',    onClick:()=>showToast('백업 완료 — 로컬에 저장됐어요','ok') },
          ].map((q,i) => (
            <button key={i} className="qa" onClick={q.onClick}>
              <div className={'ico ' + q.cls}>{q.ico}</div>
              <div className="label">{q.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 차트 행 */}
      <div className="mid-row motion-stagger">
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">메뉴 총 판매량 추이</div>
              <div className="card-sub">월 단위 비교 · 최근 6개월</div>
            </div>
            <div className="chart-tabs">
              <button className={chartTab==='week'?'active':''} onClick={()=>handleTabChange('week')}>주별</button>
              <button className={chartTab==='month'?'active':''} onClick={()=>handleTabChange('month')}>월별</button>
            </div>
          </div>
          <div className="chart-legend">
            <span><span className="dot" style={{background:'#3182F6'}}></span>이번 연도</span>
            <span><span className="dot" style={{background:'#B0B8C1'}}></span>지난 연도 동월</span>
          </div>
          <AreaChart key={chartKey}
            labels={d.labels}
            series={[{ name:'이번 연도', data:d.thisYear }, { name:'지난 연도', data:d.lastYear }]}
            colors={['#3182F6','#B0B8C1']}
            formatY={(v) => fmtKRW(v) + '개'}
          />
        </div>

        <div className="card ring-card">
          <div className="card-header">
            <div><div className="card-title">카테고리별 비중</div><div className="card-sub">이번 달 판매량 기준</div></div>
            <button className="link" onClick={()=>router.push('/menu-sales/rank')}>자세히</button>
          </div>
          <div className="ring-wrap">
            <div className="ring">
              <Donut items={DONUT_CATS} onSegmentHover={setHoveredCat} />
              <div className="center">
                <div className="v num">{fmtKRW(donutCenter)}</div>
                <div className="l">개</div>
              </div>
            </div>
            <div className="ring-rows">
              {DONUT_CATS.map((c,i) => (
                <div key={c.name} className="ring-row" style={{
                  opacity: hoveredCat !== null && hoveredCat !== i ? 0.4 : 1,
                  transition: 'opacity 200ms ease',
                  fontWeight: hoveredCat === i ? 800 : undefined,
                }}>
                  <div className="swatch" style={{background:c.color}}></div>
                  <div className="name">{c.name}</div>
                  <div className="v num">{((c.value/184320)*100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 행: 순위 + 활동 */}
      <div className="mid-row motion-stagger">
        <div className="card tx-card">
          <div className="card-header">
            <div><div className="card-title">메뉴 판매 순위 TOP 5</div><div className="card-sub">이번 달 누적</div></div>
            <button className="link accent" onClick={()=>router.push('/menu-sales/rank')}>전체 순위 →</button>
          </div>
          <div className="rank-list">
            {ranks.map(r => (
              <div key={r.rank} className="rank-row">
                <div className="rank-num num">{r.rank}</div>
                <div className="rank-name">{r.name}</div>
                <Icon.chevRight className="chev" style={{width:16,height:16}}/>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">최근 활동</div><div className="card-sub">단가 변동 · 업로드 · 노트</div></div>
            <button className="link">전체 보기</button>
          </div>
          <div className="tx-list">
            {activities.map((a,i) => {
              const m = actMeta[a.type];
              return (
                <div key={i} className="tx-row" style={{gridTemplateColumns:'36px 1fr 80px 16px',padding:'12px 4px'}}>
                  <div className="ico" style={{background:m.bg,color:m.color}}>{m.ico}</div>
                  <div className="meta">
                    <div className="who" style={{fontSize:13}}>{a.title}</div>
                    <div className="desc">{a.sub}</div>
                  </div>
                  <div className="acct" style={{fontSize:12,textAlign:'right'}}>{a.when}</div>
                  <div className="chev"><Icon.chevRight style={{width:12,height:12}}/></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
