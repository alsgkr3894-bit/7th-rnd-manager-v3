/* global React, Icon, Sidebar, TopBar, Sparkline, AreaChart, Donut, fmtKRW, fmtShort, useCountUp, showToast */
const { useState: useStateD, useRef: useRefD } = React;

function Dashboard({ onOpenUpload, onOpenNote, onNav }) {
  const [chartTab, setChartTab] = useStateD("month");
  const [chartKey, setChartKey] = useStateD(0);
  const [quickNote, setQuickNote] = useStateD("");
  const [quickSaved, setQuickSaved] = useStateD(false);
  const [hoveredCat, setHoveredCat] = useStateD(null);

  const handleTabChange = (tab) => {
    setChartTab(tab);
    setChartKey(k => k + 1);
  };

  /* KPI 카운트업 */
  const salesCount    = useCountUp(184320, { duration: 1400, delay: 250 });
  const costRateCount = useCountUp(29.4,   { duration: 1100, delay: 360, decimals: 1 });
  const notesCount    = useCountUp(17,     { duration:  900, delay: 460 });
  const donutCenter   = useCountUp(184320, { duration: 1400, delay: 250 });
  const chartData = {
    week: {
      labels: ["월", "화", "수", "목", "금", "토", "일"],
      thisWeek: [1820, 1640, 1730, 2010, 2480, 3120, 2740],
      lastWeek: [1690, 1520, 1610, 1880, 2310, 2980, 2510],
    },
    month: {
      labels: ["2025.12", "2026.01", "2026.02", "2026.03", "2026.04", "2026.05"],
      thisWeek: [148200, 152400, 161800, 168900, 172500, 184320],
      lastWeek: [142100, 145800, 152300, 158400, 161200, 172600],
    },
  };
  const d = chartData[chartTab];

  // 카테고리별 판매 비중 (11개 카테고리, 메뉴 판매량 순위 데이터와 동기화)
  const cats = [
    { name: "피자",         value: 116720, color: "#3182F6" },
    { name: "엣지&도우",  value: 20260,  color: "#8B5CF6" },
    { name: "추가토핑",     value: 12070,  color: "#06B6D4" },
    { name: "음료",         value: 7490,   color: "#F97316" },
    { name: "사이드(소스)", value: 7400, color: "#EF4444" },
    { name: "1인피자",      value: 6980,   color: "#10B981" },
    { name: "사이드",       value: 7000,   color: "#F59E0B" },
    { name: "하프앤하프",   value: 4430,   color: "#84CC16" },
    { name: "세트메뉴",     value: 3080,   color: "#EC4899" },
    { name: "행사",         value: 1990,   color: "#A78BFA" },
  ];

  // 메뉴 판매 순위 TOP 5 (귀격 합산 기준, 메뉴말만 표시)
  const ranks = [
    { rank: 1, name: "슈퍼콤비네이션" },
    { rank: 2, name: "치즈크러스트" },
    { rank: 3, name: "페퍼로니 추가" },
    { rank: 4, name: "골드스윗크러스트" },
    { rank: 5, name: "치즈 추가" },
  ];

  // 최근 활동 (단가 변동, 업로드, 노트)
  const activities = [
    { type: "price-up",   when: "방금 전",       title: "모짜렐라치즈 부가세포함단가 +3.8%",  sub: "7,400원 → 7,680원 · 영향 메뉴 23개" },
    { type: "upload",     when: "1시간 전",      title: "메뉴판매량 4월 데이터 업로드",        sub: "12,840건 처리 · 미매칭 4건" },
    { type: "note",       when: "3시간 전",      title: "횡성한우쉬림프 테스트 노트",          sub: "와사비마요 조합 · 235도 4분 50초" },
    { type: "price-down", when: "어제",          title: "양파 부가세포함단가 -5.2%",          sub: "2,100원 → 1,990원 · 영향 메뉴 18개" },
    { type: "report",     when: "어제",          title: "4월 판매량 보고서 생성 완료",         sub: "전월 대비 +6.8% · 보고용 요약 첨부" },
  ];

  return (
    <main className="main page-enter">
      {/* 인사말 */}
      <div className="greet" style={{animation:"slide-up 340ms 0ms cubic-bezier(0.2,0.8,0.2,1) both"}}>
        <div>
          <h1>안녕하세요, <span className="accent">민혁 책임</span>님</h1>
          <div className="sub">오늘은 새로운 단가 변동 2건과 미확인 미매칭 메뉴 4건이 있어요.</div>
        </div>
        <div className="right">
          <button className="btn" onClick={onOpenUpload}>
            <Icon.upload style={{width:16, height:16}} />
            제때판매가 업로드
          </button>
          <button className="btn primary" onClick={onOpenNote}>
            <Icon.plus style={{width:16, height:16}} />
            새 테스트 노트
          </button>
        </div>
      </div>

      {/* HERO: 이번 달 매출 + KPI 2 */}
      <div className="hero-row motion-stagger">
        {/* 큰 메인 카드 */}
        <div className="card balance-card">
          <div className="hero-dots" />
          <div className="eyebrow">
            <Icon.chart style={{width:14, height:14}} />
            이번 달 누적 판매량
          </div>
          <div className="acct">2026년 5월 · 5월 1일 ~ 5월 22일 기준</div>
          <div className="amount num">
            {fmtKRW(salesCount)}<span className="unit">개</span>
          </div>
          <div className="delta">
            <Icon.arrowUp style={{width:14, height:14}} />
            전월 동기 대비 +6.8% (11,720개)
          </div>
          <div className="actions">
            <button className="btn dark-onlight primary">
              메뉴별 보기
              <Icon.chevRight style={{width:14, height:14}} />
            </button>
            <button className="btn dark-onlight">CSV 내보내기</button>
          </div>
        </div>

        {/* KPI 1: 평균 원가율 */}
        <div className="card kpi-card">
          <div>
            <div className="label">
              평균 원가율
              <span className="pill">피자 카테고리</span>
            </div>
            <div className="value num">{costRateCount.toFixed(1)}<span className="unit">%</span></div>
            <div className="trend">
              <span className="up"><Icon.arrowDown style={{width:12,height:12,display:"inline",verticalAlign:"-2px"}}/> -0.6%p</span>
              <span style={{color:"var(--text-4)"}}>전월 대비</span>
            </div>
          </div>
          <Sparkline data={[31.2, 30.8, 31.5, 30.4, 30.1, 29.8, 29.4]} color="#10B981" />
        </div>

        {/* KPI 2: 신규 테스트 */}
        <div className="card kpi-card">
          <div>
            <div className="label">진행 중 R&amp;D 노트</div>
            <div className="value num">{notesCount}<span className="unit">건</span></div>
            <div className="trend">
              <span style={{color:"var(--accent-text)"}}>+4 보고예정</span>
              <span style={{color:"var(--text-4)"}}>이번 주</span>
            </div>
          </div>
          <Sparkline data={[8, 10, 9, 12, 13, 15, 17]} color="#3182F6" />
        </div>
      </div>

      {/* 주간 운영 현황 — 정합성 / 액션 아이템 / 원가율 위험 */}
      <div className="status-row motion-stagger" style={{"--stagger-base":"300ms"}}>
        {/* 1) 데이터 정합성 */}
        <div className="card status-card">
          <div className="card-header" style={{marginBottom:8}}>
            <div>
              <div className="card-title">데이터 정합성</div>
              <div className="card-sub">오계산 방지를 위한 확인 항목</div>
            </div>
            <span className="chip" style={{background:"var(--warn-soft)", color:"var(--warn)"}}>
              조치 필요 6건
            </span>
          </div>
          <div className="status-list">
            <button className="status-item">
              <div className="status-ico" style={{background:"var(--warn-soft)", color:"var(--warn)"}}><Icon.alert style={{width:16,height:16}}/></div>
              <div className="status-meta">
                <div className="status-name">단가 미연동 품목</div>
                <div className="status-desc">최신 제때 단가와 매칭 안 됨</div>
              </div>
              <div className="status-val num">2</div>
              <Icon.chevRight className="chev" style={{width:14,height:14}}/>
            </button>
            <button className="status-item">
              <div className="status-ico" style={{background:"var(--negative-soft)", color:"var(--negative)"}}><Icon.alert style={{width:16,height:16}}/></div>
              <div className="status-meta">
                <div className="status-name">미매칭 메뉴</div>
                <div className="status-desc">판매 데이터와 메뉴명 불일치</div>
              </div>
              <div className="status-val num">4</div>
              <Icon.chevRight className="chev" style={{width:14,height:14}}/>
            </button>
            <button className="status-item">
              <div className="status-ico" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}><Icon.alert style={{width:16,height:16}}/></div>
              <div className="status-meta">
                <div className="status-name">단위 확인 필요</div>
                <div className="status-desc">세부 원가표 사용 단위 불일치</div>
              </div>
              <div className="status-val num">0</div>
              <Icon.chevRight className="chev" style={{width:14,height:14}}/>
            </button>
          </div>
        </div>

        {/* 2) 이번 주 액션 */}
        <div className="card status-card">
          <div className="card-header" style={{marginBottom:8}}>
            <div>
              <div className="card-title">이번 주 액션</div>
              <div className="card-sub">보고 · 재테스트 · 마감임박</div>
            </div>
            <button className="link accent">전체 →</button>
          </div>
          <div className="status-list">
            <button className="status-item">
              <div className="status-ico" style={{background:"#F0EBFF", color:"#6B3FCB"}}><Icon.note style={{width:16,height:16}}/></div>
              <div className="status-meta">
                <div className="status-name">보고예정 노트</div>
                <div className="status-desc">황성한우셰림프 외 2건</div>
              </div>
              <div className="status-val num">3</div>
              <Icon.chevRight className="chev" style={{width:14,height:14}}/>
            </button>
            <button className="status-item">
              <div className="status-ico" style={{background:"var(--warn-soft)", color:"var(--warn)"}}><Icon.beaker style={{width:16,height:16}}/></div>
              <div className="status-meta">
                <div className="status-name">재테스트 대기</div>
                <div className="status-desc">이번 주 내 테스트 예정</div>
              </div>
              <div className="status-val num">5</div>
              <Icon.chevRight className="chev" style={{width:14,height:14}}/>
            </button>
            <button className="status-item">
              <div className="status-ico" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}><Icon.doc style={{width:16,height:16}}/></div>
              <div className="status-meta">
                <div className="status-name">보고서 마감임박</div>
                <div className="status-desc">5월 판매량 보고서 · D-2</div>
              </div>
              <div className="status-val num">1</div>
              <Icon.chevRight className="chev" style={{width:14,height:14}}/>
            </button>
          </div>
        </div>

        {/* 3) 원가율 위험 */}
        <div className="card status-card">
          <div className="card-header" style={{marginBottom:8}}>
            <div>
              <div className="card-title">원가율 위험 메뉴</div>
              <div className="card-sub">35% 초과 · 단가 인상 영향</div>
            </div>
            <span className="chip" style={{background:"var(--negative-soft)", color:"var(--negative)"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"var(--negative)",display:"inline-block"}}></span>
              주의
            </span>
          </div>
          <div className="risk-list">
            {[
              { name: "포테이토피자 L", rate: 38.2, delta: +2.1, reason: "치즈 단가 인상" },
              { name: "고르곤졸라 L",   rate: 36.8, delta: +1.4, reason: "고르곤졸라 인상" },
              { name: "새우파티 L",       rate: 35.5, delta: +0.6, reason: "새우 단가 인상" },
            ].map((r,i) => (
              <button className="risk-row" key={i} onClick={()=>{
                onNav?.("cost-pizza-summary");
                showToast(`${r.name} 원가표로 이동`, "info");
              }}>
                <div className="risk-name">{r.name}</div>
                <div className="risk-rate num">{r.rate}<span className="unit">%</span></div>
                <div className="risk-reason">{r.reason}</div>
                <div className="risk-delta" style={{color: r.delta>=0?"var(--negative)":"var(--positive)"}}>
                  {r.delta>=0?"▲":"▼"} {Math.abs(r.delta)}%p
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 인라인 빠른 노트 */}
      <div className="card quick-note">
        <div className="quick-note-ico"><Icon.beaker style={{width:18,height:18}}/></div>
        <input
          className="quick-note-input"
          placeholder="끝난 테스트 한 줄 메모 — 예: 황성한우셰림프 와사비마요 235°4뵐50초 · 감츠한 맛"
          value={quickNote}
          onChange={e=>{ setQuickNote(e.target.value); setQuickSaved(false); }}
          onKeyDown={e=>{
            if (e.key === "Enter" && quickNote.trim()) {
              setQuickSaved(true);
              showToast("노트 저장됨 ✓", "ok");
              setTimeout(()=>{ setQuickNote(""); setQuickSaved(false); }, 1500);
            }
          }}
        />
        <div className="quick-note-hint">{quickSaved ? <span style={{color:"var(--positive)"}}><Icon.check style={{width:14,height:14,verticalAlign:"-2px"}}/> 저장됨</span> : <span><kbd>Enter</kbd>로 저장</span>}</div>
        <button className="btn primary sm" disabled={!quickNote.trim()} onClick={onOpenNote}>자세히</button>
      </div>

      {/* 빠른 작업 */}
      <div className="card flat" style={{padding: 0}}>
        <div className="quick quick-5">
          <button className="qa" onClick={onOpenUpload}>
            <div className="ico"><Icon.upload style={{width:22,height:22}}/></div>
            <div className="label">제때 판매가 업로드</div>
          </button>
          <button className="qa" onClick={onOpenNote}>
            <div className="ico purple"><Icon.note style={{width:22,height:22}}/></div>
            <div className="label">노트 작성</div>
          </button>
          <button className="qa">
            <div className="ico pink"><Icon.doc style={{width:22,height:22}}/></div>
            <div className="label">보고서 생성</div>
          </button>
          <button className="qa">
            <div className="ico orange"><Icon.calc style={{width:22,height:22}}/></div>
            <div className="label">원가 계산</div>
          </button>
          <button className="qa">
            <div className="ico gray"><Icon.download style={{width:22,height:22}}/></div>
            <div className="label">데이터 백업</div>
          </button>
        </div>
      </div>

      {/* 중간 행: 판매 추이 + 카테고리 도넛 */}
      <div className="mid-row motion-stagger">
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">메뉴 총 판매량 추이</div>
              <div className="card-sub">월 단위 비교 · 최근 6개월</div>
            </div>
            <div className="chart-tabs">
              <button className={chartTab==="week"?"active":""} onClick={()=>handleTabChange("week")}>주별</button>
              <button className={chartTab==="month"?"active":""} onClick={()=>handleTabChange("month")}>월별</button>
            </div>
          </div>
          <div className="chart-legend">
            <span><span className="dot" style={{background:"#3182F6"}}></span>이번 연도</span>
            <span><span className="dot" style={{background:"#B0B8C1"}}></span>지난 연도 동월</span>
          </div>
          <AreaChart
            key={chartKey}
            labels={d.labels}
            series={[
              { name: "이번 연도", data: d.thisWeek },
              { name: "지난 연도", data: d.lastWeek },
            ]}
            colors={["#3182F6", "#B0B8C1"]}
            formatY={(v) => fmtKRW(v) + "개"}
          />
        </div>

        <div className="card ring-card">
          <div className="card-header">
            <div>
              <div className="card-title">카테고리별 비중</div>
              <div className="card-sub">이번 달 판매량 기준</div>
            </div>
            <button className="link">자세히</button>
          </div>
          <div className="ring-wrap">
            <div className="ring">
              <Donut items={cats} onSegmentHover={setHoveredCat} />
              <div className="center">
                <div className="v num">{fmtKRW(donutCenter)}</div>
                <div className="l">개</div>
              </div>
            </div>
            <div className="ring-rows">
              {cats.map((c, i) => (
                <div className="ring-row" key={c.name}
                  style={{ opacity: hoveredCat !== null && hoveredCat !== i ? 0.4 : 1,
                           transition: "opacity 200ms ease",
                           fontWeight: hoveredCat === i ? 800 : undefined }}>
                  <div className="swatch" style={{background:c.color}}></div>
                  <div className="name">{c.name}</div>
                  <div className="v num">{c.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 행: 메뉴 순위 + 최근 활동 */}
      <div className="mid-row motion-stagger">
        <div className="card tx-card">
          <div className="card-header">
            <div>
              <div className="card-title">메뉴 판매 순위 TOP 5</div>
              <div className="card-sub">이번 달 누적</div>
            </div>
            <button className="link accent">전체 순위 →</button>
          </div>
          <div className="filters">
            <button className="chip active">전체</button>
            <button className="chip">피자</button>
            <button className="chip">1인피자</button>
            <button className="chip">사이드</button>
            <button className="chip">세트메뉴</button>
            <button className="chip">추가토핑</button>
          </div>
          <div className="rank-list">
            {ranks.map(r => (
              <div className="rank-row" key={r.rank}>
                <div className="rank-num num">{r.rank}</div>
                <div className="rank-name">{r.name}</div>
                <Icon.chevRight className="chev" style={{width:16, height:16}}/>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">최근 활동</div>
              <div className="card-sub">단가 변동 · 업로드 · 노트</div>
            </div>
            <button className="link">전체 보기</button>
          </div>
          <div className="tx-list">
            {activities.map((a, i) => {
              const meta = {
                "price-up":   { ico: <Icon.arrowUp style={{width:18,height:18}}/>,   cls:"out", color:"var(--negative)", bg:"var(--negative-soft)" },
                "price-down": { ico: <Icon.arrowDown style={{width:18,height:18}}/>, cls:"in",  color:"var(--positive)", bg:"var(--positive-soft)" },
                "upload":     { ico: <Icon.upload style={{width:18,height:18}}/>,    cls:"",    color:"var(--accent-text)", bg:"var(--accent-soft)" },
                "note":       { ico: <Icon.beaker style={{width:18,height:18}}/>,    cls:"",    color:"#6B3FCB", bg:"#F0EBFF" },
                "report":     { ico: <Icon.doc style={{width:18,height:18}}/>,       cls:"",    color:"var(--text-2)", bg:"var(--surface-2)" },
              }[a.type];
              return (
                <div className="tx-row" key={i} style={{gridTemplateColumns:"36px 1fr 80px 16px", padding:"12px 4px"}}>
                  <div className="ico" style={{background:meta.bg, color:meta.color}}>{meta.ico}</div>
                  <div className="meta">
                    <div className="who" style={{fontSize:13}}>{a.title}</div>
                    <div className="desc">{a.sub}</div>
                  </div>
                  <div className="acct" style={{fontSize:12, textAlign:"right"}}>{a.when}</div>
                  <div className="chev"><Icon.chevRight style={{width:12, height:12}}/></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

window.Dashboard = Dashboard;
