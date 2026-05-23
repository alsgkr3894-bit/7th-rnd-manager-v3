/* global React, Icon, Pages, fmtKRW, fmtShort */
const { useState: useCT, useMemo: useCTMemo } = React;
const { PageHeader, FilterBar } = window.Pages;

/* ============================================================
   데이터 모델
============================================================ */

// 피자 메뉴 (L/R 별 종합 원가표용)
const PIZZA_MENUS = [
  { name:"슈퍼콤비네이션", base:5840, price:{L:32900, R:18900}, sale:{L:32900, R:18900} },
  { name:"포테이토피자",    base:6890, price:{L:29900, R:16900}, sale:{L:29900, R:16900} },
  { name:"불고기피자",      base:5210, price:{L:30900, R:17900}, sale:{L:30900, R:17900} },
  { name:"고르곤졸라",      base:7320, price:{L:33900, R:19900}, sale:{L:33900, R:19900} },
  { name:"새우파티",        base:7920, price:{L:34900, R:20900}, sale:{L:34900, R:20900} },
  { name:"하와이안",        base:5040, price:{L:28900, R:15900}, sale:{L:28900, R:15900} },
  { name:"쉬림프골드",      base:7480, price:{L:36900, R:21900}, sale:{L:36900, R:21900} },
  { name:"치즈피자",        base:4280, price:{L:25900, R:14900}, sale:{L:25900, R:14900} },
];

// 엣지 4종 — 기본 추가 원가
const EDGES = {
  "석쇠":            { addL: 0,    addR: 0    },
  "치즈크러스트":    { addL: 2680, addR: 1480 },
  "골드스윗크러스트":{ addL: 3120, addR: 1720 },
  "씬도우":          { addL: -480, addR: -260 },
};

// 1인피자
const PERSONAL_MENUS = [
  { name:"콤비 1인",          cost:4290, sale:14900 },
  { name:"포테이토 1인",      cost:4870, sale:14900 },
  { name:"불고기 1인",        cost:4120, sale:14900 },
  { name:"치즈 1인",          cost:3680, sale:13900 },
];

// 사이드 메뉴
const SIDE_MENUS = [
  { name:"오븐스파게티",  cost:2160, sale:7900 },
  { name:"치즈스틱",      cost:1820, sale:6900 },
  { name:"치즈볼",        cost:2410, sale:8900 },
  { name:"치킨윙",        cost:3120, sale:9900 },
  { name:"감자튀김",      cost:980,  sale:4900 },
];

// 세트박스 메뉴 (메뉴 원가 참조 포함)
const SET_MENUS = [
  { name:"패밀리박스 L",  cost:17600, sale:42900,
    components:["슈퍼콤비네이션 L", "오븐스파게티", "콜라 1.25L", "박스 L"] },
  { name:"더블박스 L",    cost:15800, sale:38900,
    components:["피자 L (선택)", "사이드 1종", "콜라 1.25L"] },
  { name:"커플박스 R",    cost:11200, sale:26900,
    components:["피자 R (선택)", "치즈스틱", "콜라 500ml"] },
];

// 피자 세부 원가표 (구성품별)
const PIZZA_DETAIL = {
  "슈퍼콤비네이션 L": {
    components: [
      { name:"도우 L",              qty:1,   unit:"개", linked:"D001", unitPrice:560,    subtotal:560 },
      { name:"피자박스 L",          qty:1,   unit:"개", linked:"P001", unitPrice:148,    subtotal:148 },
      { name:"피클 1입",            qty:1,   unit:"개", linked:null,   unitPrice:80,     subtotal:80 },
      { name:"피자소스",            qty:80,  unit:"g",  linked:"S001", unitPrice:3.7,    subtotal:296 },
      { name:"모짜렐라치즈",        qty:220, unit:"g",  linked:"C001", unitPrice:3.84,   subtotal:845 },
      { name:"페퍼로니",            qty:60,  unit:"g",  linked:"T001", unitPrice:12.1,   subtotal:726 },
      { name:"불고기",              qty:40,  unit:"g",  linked:"T003", unitPrice:14.2,   subtotal:568 },
      { name:"양파",                qty:40,  unit:"g",  linked:"V001", unitPrice:0.199,  subtotal:8 },
      { name:"피망",                qty:30,  unit:"g",  linked:"V002", unitPrice:1.68,   subtotal:50 },
      { name:"올리브",              qty:20,  unit:"g",  linked:"T004", unitPrice:8.07,   subtotal:161 },
    ],
  },
};

/* ============================================================
   원가계산 랜딩 페이지 — 대시보드 스타일
============================================================ */
function CostLandingPage({ onNav }) {
  const categories = [
    { id:"pizza",    icon:Icon.pizza,  label:"피자 원가",     desc:"엣지 4종 × L/R 규격",  avgRate:31.2, count:18, color:"#3182F6",
      sumTo:"cost-pizza-summary", detailTo:"cost-pizza-detail" },
    { id:"personal", icon:Icon.pizza,  label:"1인피자 원가",  desc:"단일 규격 메뉴별",      avgRate:29.4, count:4,  color:"#10B981",
      sumTo:"cost-personal-summary", detailTo:"cost-personal-detail" },
    { id:"side",     icon:Icon.box,    label:"사이드 메뉴",   desc:"포장재 포함",            avgRate:28.5, count:5,  color:"#F59E0B",
      sumTo:"cost-side-summary", detailTo:"cost-side-detail" },
    { id:"set",      icon:Icon.box,    label:"세트박스",      desc:"기존 메뉴 원가 참조",    avgRate:30.5, count:3,  color:"#EC4899",
      sumTo:"cost-set-summary", detailTo:"cost-set-detail" },
  ];

  const refs = [
    { icon:Icon.calc,  label:"엣지 & 도우 원가표",   desc:"피자 세부 원가표에서 참조하는 공통 기준", to:"cost-edge-dough",        color:"#8B5CF6" },
    { icon:Icon.tag,   label:"식자재 원가표",        desc:"제때 단가 단일 기준 · g·개당 자동 계산", to:"cost-ingredient-price",  color:"#06B6D4" },
    { icon:Icon.doc,   label:"메뉴 판매가 기준표",    desc:"원가율 계산의 분모가 되는 판매가 등록",  to:"cost-menu-price",        color:"#F97316" },
    { icon:Icon.chart, label:"식자재 사용 현황",     desc:"재료가 어떤 메뉴에 들어가는지 분석",     to:"ingredient-usage",  color:"#84CC16" },
  ];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산"]}
        title="원가계산"
        sub="메뉴별 종합·세부 원가표와 공통 원가 기준을 관리해요. 최신 제때 단가가 모든 원가표에 자동 반영돼요."
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>전체 양식 다운로드</button>
        </>}
      />

      {/* 핵심 지표 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">평균 원가율</div>
          <div className="stat-value num">29.4<span className="unit">%</span></div>
          <div className="stat-bar"><div className="stat-bar-fill" style={{width:"58.8%"}}></div></div>
          <div className="stat-foot" style={{color:"var(--positive)"}}>전월 −0.6%p</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">원가율 위험 메뉴</div>
          <div className="stat-value num" style={{color:"var(--negative)"}}>4<span className="unit">개</span></div>
          <div className="stat-foot">원가율 35% 초과 · 즉시 검토</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">최신 제때 단가</div>
          <div className="stat-value" style={{fontSize:20}}>2026.05.21</div>
          <div className="stat-foot" style={{color:"var(--accent-text)"}}>5개 품목 단가 변동 반영됨</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">단가 미연동</div>
          <div className="stat-value num" style={{color:"var(--warn)"}}>2<span className="unit">개</span></div>
          <div className="stat-foot">단가표에 매칭 필요</div>
        </div>
      </div>

      {/* 카테고리별 원가 — 큰 카드 */}
      <div>
        <div className="cost-section-h">메뉴 카테고리 원가</div>
        <div className="cost-cat-grid">
          {categories.map(c => (
            <div key={c.id} className="cost-cat-card">
              <div className="cost-cat-head">
                <div className="cost-cat-ico" style={{background: c.color + "20", color: c.color}}>
                  <c.icon style={{width:22, height:22}}/>
                </div>
                <div className="cost-cat-meta">
                  <div className="cost-cat-title">{c.label}</div>
                  <div className="cost-cat-sub">{c.desc}</div>
                </div>
              </div>
              <div className="cost-cat-stats">
                <div className="cost-stat">
                  <div className="cost-stat-label">평균 원가율</div>
                  <div className="cost-stat-val num" style={{color: c.avgRate >= 32 ? "var(--negative)" : "var(--text-1)"}}>
                    {c.avgRate}<span className="unit">%</span>
                  </div>
                </div>
                <div className="cost-stat">
                  <div className="cost-stat-label">메뉴 수</div>
                  <div className="cost-stat-val num">{c.count}<span className="unit">개</span></div>
                </div>
              </div>
              <div className="cost-cat-actions">
                <button className="btn block" onClick={()=>onNav(c.sumTo)}>
                  종합 원가표
                  <Icon.chevRight style={{width:12, height:12}}/>
                </button>
                <button className="btn block" onClick={()=>onNav(c.detailTo)}>
                  세부 원가표
                  <Icon.chevRight style={{width:12, height:12}}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 공통 원가 기준 */}
      <div>
        <div className="cost-section-h">공통 원가 기준 · 단가 관리</div>
        <div className="cost-ref-grid">
          {refs.map(r => (
            <button key={r.to} className="cost-ref-card" onClick={()=>onNav(r.to)}>
              <div className="cost-ref-ico" style={{background: r.color + "20", color: r.color}}>
                <r.icon style={{width:20, height:20}}/>
              </div>
              <div className="cost-ref-meta">
                <div className="cost-ref-title">{r.label}</div>
                <div className="cost-ref-sub">{r.desc}</div>
              </div>
              <Icon.chevRight style={{width:16, height:16, color:"var(--text-4)"}}/>
            </button>
          ))}
        </div>
      </div>

      {/* 정책 안내 */}
      <div className="card warn-card">
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">제때 가격 단일 기준 원칙</div>
          <div className="warn-text">
            원가표는 <b>제때 상품 가격 비교 모듈</b>의 최신 단가만 참조해요. 가격 파일을 원가계산 탭에서 별도 업로드하지 마세요.
            단가 미연동·단위 불일치 항목은 0원으로 계산하지 않고 <b>"확인 필요"</b>로 표시돼요.
          </div>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   피자 종합 원가표
============================================================ */
function PizzaCostSummaryPage() {
  const [edge, setEdge] = useCT("석쇠");
  const [size, setSize] = useCT("L");
  const [sortKey, setSortKey] = useCT("rate");
  const [sortDir, setSortDir] = useCT("desc");

  const rows = PIZZA_MENUS.map(m => {
    const add = EDGES[edge][size === "L" ? "addL" : "addR"];
    const cost = (size === "L" ? m.base : Math.round(m.base * 0.55)) + add;
    const sale = m.sale[size] + (edge !== "석쇠" ? (size === "L" ? 2000 : 1000) : 0);
    const rate = (cost / sale) * 100;
    return { name: m.name, cost, sale, rate };
  });

  const dir = sortDir === "asc" ? 1 : -1;
  const sorted = [...rows].sort((a,b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === "string") return va.localeCompare(vb, "ko") * dir;
    return va > vb ? dir : va < vb ? -dir : 0;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const SortIco = ({ active, dir }) => (
    <span className={"sort-ico " + (active ? "active" : "")}>
      {active ? (dir === "asc" ? "▲" : "▼") : "▾"}
    </span>
  );

  const avgRate = (sorted.reduce((s,r)=>s+r.rate,0) / sorted.length).toFixed(1);
  const riskCount = sorted.filter(r => r.rate >= 35).length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", "피자 종합 원가표"]}
        title="피자 종합 원가표"
        sub={`엣지 ${edge} · ${size} 규격 · 세부 원가표에서 계산된 최종값 표시`}
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>CSV 내보내기</button>
        </>}
      />

      {/* 엣지 / 규격 선택 */}
      <div className="filter-bar">
        <div>
          <div style={{fontSize:11, fontWeight:700, color:"var(--text-4)", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:4}}>엣지</div>
          <div className="period-tabs">
            {Object.keys(EDGES).map(e => (
              <button key={e} className={edge===e?"active":""} onClick={()=>setEdge(e)}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:700, color:"var(--text-4)", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:4}}>규격</div>
          <div className="period-tabs">
            <button className={size==="L"?"active":""} onClick={()=>setSize("L")}>L</button>
            <button className={size==="R"?"active":""} onClick={()=>setSize("R")}>R</button>
          </div>
        </div>
      </div>

      <div className="stat-row stat-2col">
        <div className="stat-card">
          <div className="stat-label">평균 원가율</div>
          <div className="stat-value num" style={{color: avgRate >= 32 ? "var(--negative)" : "var(--text-1)"}}>{avgRate}<span className="unit">%</span></div>
          <div className="stat-foot">{edge} · {size} 기준 {sorted.length}개 메뉴 평균</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">위험 메뉴 (원가율 35% 초과)</div>
          <div className="stat-value num" style={{color: riskCount > 0 ? "var(--negative)" : "var(--positive)"}}>{riskCount}<span className="unit">개</span></div>
          <div className="stat-foot">판매가 조정 또는 단가 협상 검토</div>
        </div>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={()=>toggleSort("name")} className="sortable">메뉴명 <SortIco active={sortKey==="name"} dir={sortDir}/></th>
              <th style={{width:100}}>엣지</th>
              <th style={{width:80}}>규격</th>
              <th style={{width:140, textAlign:"right"}} onClick={()=>toggleSort("sale")} className="sortable">판매가 <SortIco active={sortKey==="sale"} dir={sortDir}/></th>
              <th style={{width:140, textAlign:"right"}} onClick={()=>toggleSort("cost")} className="sortable">원가 <SortIco active={sortKey==="cost"} dir={sortDir}/></th>
              <th style={{width:120, textAlign:"right"}} onClick={()=>toggleSort("rate")} className="sortable">원가율 <SortIco active={sortKey==="rate"} dir={sortDir}/></th>
              <th style={{width:160}}>마진</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const isRisk = r.rate >= 35;
              return (
                <tr key={r.name}>
                  <td className="cell-name">
                    <div className="menu-name">{r.name}</div>
                    {isRisk && <span className="tag-risk">위험</span>}
                  </td>
                  <td><span className="cat-pill">{edge}</span></td>
                  <td className="muted">{size}</td>
                  <td className="num right">{fmtKRW(r.sale)}<span className="unit">원</span></td>
                  <td className="num right">{fmtKRW(r.cost)}<span className="unit">원</span></td>
                  <td className="num right">
                    <span className={isRisk ? "risk-num" : ""} style={{fontWeight: 700}}>
                      {r.rate.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <div className="margin-bar">
                      <div className="margin-bar-fill" style={{width: `${(100-r.rate)}%`, background: isRisk ? "var(--warn)" : "var(--positive)"}}></div>
                      <span className="margin-bar-text num">{(100 - r.rate).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ============================================================
   피자 세부 원가표
============================================================ */
function PizzaCostDetailPage() {
  const [selected, setSelected] = useCT("슈퍼콤비네이션 L");
  const [edge, setEdge] = useCT("석쇠");

  const detail = PIZZA_DETAIL["슈퍼콤비네이션 L"]; // demo
  const totalCost = detail.components.reduce((s,c)=>s+c.subtotal, 0);
  const unlinkedCount = detail.components.filter(c => !c.linked).length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", "피자 세부 원가표"]}
        title="피자 세부 원가표"
        sub="메뉴별 구성품 사용량과 단가의 실제 원가 근거표"
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>양식 다운로드</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>세부 원가 업로드</button>
        </>}
      />

      <div className="filter-bar">
        <div>
          <div style={{fontSize:11, fontWeight:700, color:"var(--text-4)", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:4}}>메뉴 선택</div>
          <select className="period-select" value={selected} onChange={e=>setSelected(e.target.value)}>
            {PIZZA_MENUS.flatMap(m => [
              <option key={m.name+"L"} value={m.name+" L"}>{m.name} L</option>,
              <option key={m.name+"R"} value={m.name+" R"}>{m.name} R</option>,
            ])}
          </select>
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:700, color:"var(--text-4)", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:4}}>엣지</div>
          <div className="period-tabs">
            {Object.keys(EDGES).map(e => (
              <button key={e} className={edge===e?"active":""} onClick={()=>setEdge(e)}>{e}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 메뉴 요약 hero */}
      <div className="hero-row">
        <div className="card balance-card">
          <div className="eyebrow"><Icon.pizza style={{width:14, height:14}}/>{selected} · {edge}</div>
          <div className="amount num">
            {fmtKRW(totalCost)}<span className="unit">원</span>
          </div>
          <div className="delta">
            <Icon.alert style={{width:14, height:14}}/>
            {detail.components.length}개 구성품 합산 · 단가 미연동 {unlinkedCount}건
          </div>
          <div style={{marginTop:20, fontSize:13, color:"rgba(255,255,255,0.6)"}}>
            판매가 <span style={{color:"#fff", fontWeight:800}} className="num">32,900원</span> · 원가율 <span style={{color:"#6FE6A8", fontWeight:800}} className="num">{((totalCost/32900)*100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div>
            <div className="label">최고 비중 재료</div>
            <div className="value" style={{fontSize:18, lineHeight:1.3}}>모짜렐라치즈</div>
            <div className="trend">
              <span style={{color:"var(--accent-text)"}}>전체 원가 중 24.0%</span>
            </div>
          </div>
        </div>

        <div className="card kpi-card">
          <div>
            <div className="label">단가 변동 영향</div>
            <div className="value num" style={{color:"var(--negative)"}}>+147<span className="unit">원</span></div>
            <div className="trend">
              <span style={{color:"var(--text-3)"}}>최근 단가 인상으로</span>
            </div>
          </div>
        </div>
      </div>

      {/* 구성품 테이블 */}
      <div className="card table-card">
        <div style={{padding:"20px 22px 12px"}}>
          <div className="card-title">구성품별 원가</div>
          <div className="card-sub">사용량 × g·개당 단가 = 세부 원가</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>구성품</th>
              <th style={{width:90}}>제품코드</th>
              <th style={{width:120, textAlign:"right"}}>사용량</th>
              <th style={{width:140, textAlign:"right"}}>g·개당 단가</th>
              <th style={{width:140, textAlign:"right"}}>세부 원가</th>
              <th style={{width:120, textAlign:"right"}}>원가 비중</th>
              <th style={{width:100}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {detail.components.map((c, i) => {
              const share = (c.subtotal / totalCost) * 100;
              return (
                <tr key={i}>
                  <td className="cell-name"><div className="menu-name">{c.name}</div></td>
                  <td className="muted mono">{c.linked || "—"}</td>
                  <td className="num right">{c.qty}<span className="unit">{c.unit}</span></td>
                  <td className="num right">{c.unitPrice.toLocaleString("ko-KR", {maximumFractionDigits:2})}<span className="unit">원/{c.unit}</span></td>
                  <td className="num right" style={{fontWeight: 700}}>{fmtKRW(c.subtotal)}<span className="unit">원</span></td>
                  <td className="num right">
                    <div className="share-cell">
                      <div className="share-mini">
                        <div className="share-mini-fill" style={{width: `${share}%`, background:"var(--accent)"}}></div>
                      </div>
                      <span>{share.toFixed(1)}<span className="unit">%</span></span>
                    </div>
                  </td>
                  <td>
                    {c.linked
                      ? <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>연동</span>
                      : <span className="chip" style={{background:"var(--warn-soft)", color:"var(--warn)"}}>미연동</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="row-total">
              <td colSpan={4} style={{textAlign:"right", fontWeight:700, color:"var(--text-2)"}}>최종 총 원가</td>
              <td className="num right" style={{fontSize:16, fontWeight:800, color:"var(--accent-text)"}}>{fmtKRW(totalCost)}<span className="unit">원</span></td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  );
}

/* ============================================================
   엣지 & 도우 원가표 (공통 기준)
============================================================ */
function EdgeDoughCostPage() {
  const items = [
    { name:"치즈크러스트 L",     comps:[
      { name:"도우 L",            qty:1,   unit:"개", cost:560 },
      { name:"피자박스 L",         qty:1,   unit:"개", cost:148 },
      { name:"피클 1입",           qty:1,   unit:"개", cost:80 },
      { name:"스트링치즈 L",       qty:120, unit:"g",  cost:1660 },
      { name:"치즈 (CH)",          qty:60,  unit:"g",  cost:232 },
    ]},
    { name:"치즈크러스트 R",     comps:[
      { name:"도우 R",            qty:1,   unit:"개", cost:400 },
      { name:"피자박스 R",         qty:1,   unit:"개", cost:120 },
      { name:"피클 1입",           qty:1,   unit:"개", cost:80 },
      { name:"스트링치즈 R",       qty:70,  unit:"g",  cost:970 },
      { name:"치즈 (CH)",          qty:35,  unit:"g",  cost:135 },
    ]},
    { name:"골드스윗크러스트 L", comps:[
      { name:"도우 L",            qty:1,   unit:"개", cost:560 },
      { name:"피자박스 L",         qty:1,   unit:"개", cost:148 },
      { name:"피클 1입",           qty:1,   unit:"개", cost:80 },
      { name:"스트링치즈 L",       qty:120, unit:"g",  cost:1660 },
      { name:"꿀시럽",             qty:30,  unit:"g",  cost:540 },
      { name:"치즈 (CH)",          qty:60,  unit:"g",  cost:232 },
    ]},
    { name:"씬도우 L",           comps:[
      { name:"씬도우 L",          qty:1,   unit:"개", cost:475 },
      { name:"피자박스 L",         qty:1,   unit:"개", cost:148 },
      { name:"피클 1입",           qty:1,   unit:"개", cost:80 },
    ]},
  ];

  const [openId, setOpenId] = useCT(0);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", "엣지 & 도우 원가표"]}
        title="엣지 & 도우 원가표"
        sub="피자 세부 원가표에서 참조하는 공통 기준 원가표"
        actions={<button className="btn primary"><Icon.upload style={{width:14, height:14}}/>업로드</button>}
      />

      <div className="info-banner info-accent">
        <div className="info-banner-ico" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          이 표의 최종 원가는 <b>피자 세부 원가표</b>에서 자동 참조돼요. 1인피자는 별도 세부 원가표 구조를 사용해요.
        </div>
      </div>

      <div className="edge-grid">
        {items.map((it, i) => {
          const total = it.comps.reduce((s,c)=>s+c.cost, 0);
          const isOpen = openId === i;
          return (
            <div key={i} className={"card edge-card " + (isOpen ? "open" : "")}>
              <div className="edge-head" onClick={()=>setOpenId(isOpen ? -1 : i)}>
                <div>
                  <div className="edge-title">{it.name}</div>
                  <div className="edge-sub">{it.comps.length}개 구성품</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="edge-cost num">{fmtKRW(total)}<span className="unit">원</span></div>
                  <span className={"chev-toggle " + (isOpen ? "open" : "")}>
                    <Icon.chevDown style={{width:14, height:14, color:"var(--text-4)"}}/>
                  </span>
                </div>
              </div>
              {isOpen && (
                <div className="edge-body">
                  {it.comps.map((c, j) => (
                    <div className="edge-comp" key={j}>
                      <span className="edge-comp-name">{c.name}</span>
                      <span className="edge-comp-qty muted num">{c.qty}<span className="unit">{c.unit}</span></span>
                      <span className="edge-comp-cost num">{fmtKRW(c.cost)}<span className="unit">원</span></span>
                    </div>
                  ))}
                  <div className="edge-foot">
                    <span style={{color:"var(--text-3)", fontWeight:600}}>합계</span>
                    <span className="num" style={{fontSize:15, fontWeight:800, color:"var(--accent-text)"}}>{fmtKRW(total)}<span className="unit">원</span></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

/* ============================================================
   메뉴 판매가 기준표
============================================================ */
function MenuSalePricePage() {
  const rows = PIZZA_MENUS.map(m => ({
    name:m.name, cat:"피자",
    priceL:m.sale.L, priceR:m.sale.R,
    updated:"2026.05.01",
  })).concat(PERSONAL_MENUS.map(m => ({
    name:m.name, cat:"1인피자", priceL:m.sale, priceR:null, updated:"2026.05.01",
  }))).concat(SIDE_MENUS.map(m => ({
    name:m.name, cat:"사이드", priceL:m.sale, priceR:null, updated:"2026.04.20",
  })));

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", "메뉴 판매가 기준표"]}
        title="메뉴 판매가 기준표"
        sub="원가율 계산의 분모가 되는 판매가 — 별도 양식 업로드로 관리해요"
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>양식 다운로드</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>판매가 업로드</button>
        </>}
      />

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>메뉴명</th>
              <th style={{width:110}}>카테고리</th>
              <th style={{width:140, textAlign:"right"}}>L 판매가</th>
              <th style={{width:140, textAlign:"right"}}>R 판매가</th>
              <th style={{width:140}}>등록일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i}>
                <td className="cell-name"><div className="menu-name">{r.name}</div></td>
                <td><span className="cat-pill">{r.cat}</span></td>
                <td className="num right">{r.priceL ? fmtKRW(r.priceL) + "원" : "—"}</td>
                <td className="num right">{r.priceR ? fmtKRW(r.priceR) + "원" : <span className="muted">—</span>}</td>
                <td className="muted mono" style={{fontSize:12}}>{r.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ============================================================
   식자재 사용 현황
============================================================ */
function IngredientUsagePage() {
  const [cat, setCat] = useCT("토핑");
  const data = {
    "토핑": [
      { name:"페퍼로니",     count:8, menus:["슈퍼콤비네이션","불고기피자","트러플 페퍼로니","하와이안","쉬림프골드","치즈피자(추가)","1인 콤비","페퍼로니 추가"] },
      { name:"모짜렐라치즈", count:23, menus:["전체 피자류"] },
      { name:"불고기",       count:4, menus:["슈퍼콤비네이션","불고기피자","불고기 1인","하프 콤비&불고기"] },
      { name:"새우",         count:3, menus:["새우파티","쉬림프골드","트러플 페퍼로니"] },
      { name:"베이컨",       count:5, menus:["슈퍼콤비네이션","하와이안","치즈피자(추가)","1인 콤비","베이컨 추가"] },
      { name:"옥수수콘",     count:4, menus:["슈퍼콤비네이션","하와이안","치즈피자(옵션)","1인 콤비"] },
    ],
    "소스": [
      { name:"피자소스",   count:20, menus:["전체 피자류"] },
      { name:"갈릭소스",   count:1,  menus:["갈릭소스 단품"] },
      { name:"핫소스",     count:1,  menus:["핫소스 단품"] },
    ],
    "사이드": [
      { name:"감자",       count:3, menus:["포테이토피자","감자튀김","포테이토 1인"] },
      { name:"스파게티면", count:1, menus:["오븐스파게티"] },
      { name:"치즈볼믹스", count:1, menus:["치즈볼"] },
      { name:"치킨윙",     count:1, menus:["치킨윙"] },
    ],
  };

  const tabs = ["토핑", "소스", "사이드"];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", "식자재 사용 현황"]}
        title="식자재 사용 현황"
        sub="재료별로 어떤 메뉴에 사용되는지 분석 — 토핑·소스·사이드 3개 분류"
      />

      <div className="filter-bar">
        <div className="period-tabs">
          {tabs.map(t => (
            <button key={t} className={cat===t?"active":""} onClick={()=>setCat(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="info-banner info-accent">
        <div className="info-banner-ico" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          포장재·박스·스티커는 제외 · 같은 메뉴의 L/R은 1개로 집계 · 엣지/도우 경유 재료는 엣지/도우 1개 사용처로 계산
        </div>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:80}}>구분</th>
              <th style={{width:200}}>재료명</th>
              <th style={{width:140, textAlign:"right"}}>사용 메뉴 수</th>
              <th>사용 메뉴 목록</th>
            </tr>
          </thead>
          <tbody>
            {data[cat].map((r,i) => (
              <tr key={i}>
                <td><span className="cat-pill">{cat}</span></td>
                <td className="cell-name"><div className="menu-name">{r.name}</div></td>
                <td className="num right" style={{fontWeight: 800, fontSize: 15}}>{r.count}<span className="unit">개</span></td>
                <td>
                  <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                    {r.menus.map(m => (
                      <span key={m} className="chip" style={{background:"var(--surface-2)", color:"var(--text-2)"}}>{m}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ============================================================
   1인피자 / 사이드 / 세트박스 — 공통 종합 / 세부 템플릿
============================================================ */
function GenericSummaryPage({ kind }) {
  const meta = {
    personal: { title:"1인피자 종합 원가표", crumb:"1인피자 종합 원가표", data:PERSONAL_MENUS, cat:"1인피자" },
    side:     { title:"사이드 메뉴 종합 원가표", crumb:"사이드 종합 원가표", data:SIDE_MENUS, cat:"사이드" },
    set:      { title:"세트박스 종합 원가표", crumb:"세트박스 종합 원가표", data:SET_MENUS, cat:"세트박스" },
  }[kind];

  const enriched = meta.data.map(m => ({ ...m, rate: (m.cost/m.sale)*100 }));
  const avgRate = (enriched.reduce((s,r)=>s+r.rate,0)/enriched.length).toFixed(1);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", meta.crumb]}
        title={meta.title}
        sub={`${meta.cat} 메뉴별 최종 원가율 요약 · 세부 원가표 기반 자동 산출`}
        actions={<button className="btn"><Icon.download style={{width:14, height:14}}/>CSV 내보내기</button>}
      />

      <div className="stat-row stat-2col">
        <div className="stat-card">
          <div className="stat-label">평균 원가율</div>
          <div className="stat-value num">{avgRate}<span className="unit">%</span></div>
          <div className="stat-foot">{meta.cat} {enriched.length}개 메뉴</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">위험 메뉴 (35% 초과)</div>
          <div className="stat-value num" style={{color: enriched.filter(r=>r.rate>=35).length > 0 ? "var(--negative)" : "var(--positive)"}}>
            {enriched.filter(r=>r.rate>=35).length}<span className="unit">개</span>
          </div>
          <div className="stat-foot">판매가 조정 또는 단가 협상 검토</div>
        </div>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>메뉴명</th>
              {kind === "set" && <th style={{width:240}}>구성품</th>}
              <th style={{width:140, textAlign:"right"}}>판매가</th>
              <th style={{width:140, textAlign:"right"}}>원가</th>
              <th style={{width:120, textAlign:"right"}}>원가율</th>
              <th style={{width:160}}>마진</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map(r => {
              const isRisk = r.rate >= 35;
              return (
                <tr key={r.name}>
                  <td className="cell-name">
                    <div className="menu-name">{r.name}</div>
                    {isRisk && <span className="tag-risk">위험</span>}
                  </td>
                  {kind === "set" && (
                    <td>
                      <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                        {r.components.map(c => (
                          <span key={c} className="chip" style={{background:"var(--surface-2)", color:"var(--text-2)", fontSize:11}}>{c}</span>
                        ))}
                      </div>
                    </td>
                  )}
                  <td className="num right">{fmtKRW(r.sale)}<span className="unit">원</span></td>
                  <td className="num right">{fmtKRW(r.cost)}<span className="unit">원</span></td>
                  <td className="num right">
                    <span className={isRisk ? "risk-num" : ""} style={{fontWeight: 700}}>
                      {r.rate.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <div className="margin-bar">
                      <div className="margin-bar-fill" style={{width: `${100-r.rate}%`, background: isRisk ? "var(--warn)" : "var(--positive)"}}></div>
                      <span className="margin-bar-text num">{(100-r.rate).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function GenericDetailPage({ kind }) {
  const meta = {
    personal: { title:"1인피자 세부 원가표", crumb:"1인피자 세부 원가표", data:PERSONAL_MENUS, cat:"1인피자" },
    side:     { title:"사이드 메뉴 세부 원가표", crumb:"사이드 세부 원가표", data:SIDE_MENUS, cat:"사이드" },
    set:      { title:"세트박스 세부 원가표", crumb:"세트박스 세부 원가표", data:SET_MENUS, cat:"세트박스" },
  }[kind];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", meta.crumb]}
        title={meta.title}
        sub={`${meta.cat} 메뉴별 실제 레시피 원가 근거표 · ${kind === "set" ? "기존 메뉴 원가 참조 가능" : "구성품·사용량 관리"}`}
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>양식 다운로드</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>세부 원가 업로드</button>
        </>}
      />

      <div className="empty-state" style={{marginTop:16}}>
        <Icon.calc style={{width:40, height:40, color:"var(--text-4)"}}/>
        <div className="empty-title">세부 원가 데이터를 업로드해주세요</div>
        <div className="empty-sub">양식을 다운로드 → 작성 → 업로드하면 미리보기 후 반영해요.</div>
        <div style={{marginTop:16, display:"flex", gap:8, justifyContent:"center"}}>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>양식 다운로드</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>파일 업로드</button>
        </div>
      </div>
    </main>
  );
}

Object.assign(window.Pages, {
  CostLandingPage,
  PizzaCostSummaryPage,
  PizzaCostDetailPage,
  EdgeDoughCostPage,
  MenuSalePricePage,
  IngredientUsagePage,
  GenericSummaryPage,
  GenericDetailPage,
});
