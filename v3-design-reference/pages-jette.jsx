/* global React, Icon, Pages, fmtKRW, fmtShort, showToast */
const { useState: useJT, useMemo: useJTMemo } = React;
const { PageHeader, FilterBar } = window.Pages;

/* ============================================================
   공통 — 제품 카테고리 (재료군)
============================================================ */
const JETTE_CATS = [
  { id: "all",    label: "전체",   color: "#3182F6" },
  { id: "치즈",   label: "치즈",   color: "#F59E0B" },
  { id: "토핑",   label: "토핑",   color: "#EF4444" },
  { id: "소스",   label: "소스",   color: "#10B981" },
  { id: "도우",   label: "도우",   color: "#8B5CF6" },
  { id: "야채",   label: "야채",   color: "#84CC16" },
  { id: "포장",   label: "포장",   color: "#6B7280" },
  { id: "음료",   label: "음료",   color: "#F97316" },
];

const JETTE_PRODUCTS = [
  { code:"C001", name:"모짜렐라치즈 2kg",    cat:"치즈",  type:"관리품목", price:7680, prev:7400, applied:"2026.05.21",
    history:[7100,7100,7200,7200,7400,7400,7680], shipment:[420,460,480,520,540,580,610] },
  { code:"C002", name:"체다치즈 1kg",         cat:"치즈",  type:"관리품목", price:5940, prev:5940, applied:"2026.04.05",
    history:[5900,5900,5940,5940,5940,5940,5940], shipment:[180,190,180,200,210,220,210] },
  { code:"C003", name:"고르곤졸라치즈 500g",  cat:"치즈",  type:"관리품목", price:14300, prev:13400, applied:"2026.05.21",
    history:[12800,13000,13000,13400,13400,13400,14300], shipment:[90,95,100,110,120,118,130] },
  { code:"C004", name:"파마산치즈 500g",      cat:"치즈",  type:"범용상품", price:18900, prev:18900, applied:"2026.03.15",
    history:[18900,18900,18900,18900,18900,18900,18900], shipment:[40,42,45,48,46,50,55] },
  { code:"S001", name:"피자소스 5L",          cat:"소스",  type:"관리품목", price:18500, prev:18000, applied:"2026.05.10",
    history:[17500,17800,17800,18000,18000,18000,18500], shipment:[80,85,90,92,95,100,105] },
  { code:"S002", name:"갈릭소스 1L",          cat:"소스",  type:"관리품목", price:6800, prev:6800, applied:"2026.02.20",
    history:[6500,6500,6800,6800,6800,6800,6800], shipment:[150,160,170,165,180,185,190] },
  { code:"S003", name:"핫소스 500ml",         cat:"소스",  type:"범용상품", price:4200, prev:4400, applied:"2026.05.18",
    history:[4400,4400,4400,4400,4400,4400,4200], shipment:[60,65,68,70,72,75,78] },
  { code:"T001", name:"페퍼로니 1kg",         cat:"토핑",  type:"관리품목", price:12100, prev:12100, applied:"2026.03.20",
    history:[11800,11800,12100,12100,12100,12100,12100], shipment:[220,240,260,250,270,280,290] },
  { code:"T002", name:"새우(냉동) 1kg",       cat:"토핑",  type:"관리품목", price:19800, prev:18600, applied:"2026.05.21",
    history:[17500,17500,18000,18600,18600,18600,19800], shipment:[80,85,90,100,110,115,120] },
  { code:"T003", name:"불고기 1kg",           cat:"토핑",  type:"관리품목", price:14200, prev:13800, applied:"2026.04.30",
    history:[13200,13500,13500,13800,13800,13800,14200], shipment:[110,120,130,135,140,145,150] },
  { code:"T004", name:"올리브 3kg",           cat:"토핑",  type:"범용상품", price:24200, prev:24200, applied:"2026.01.10",
    history:[23800,24200,24200,24200,24200,24200,24200], shipment:[30,32,35,33,36,38,40] },
  { code:"T005", name:"베이컨 1kg",           cat:"토핑",  type:"관리품목", price:13500, prev:12800, applied:"2026.05.21",
    history:[12500,12500,12800,12800,12800,12800,13500], shipment:[140,150,155,160,168,170,180] },
  { code:"V001", name:"양파 10kg",            cat:"야채",  type:"관리품목", price:1990, prev:2100, applied:"2026.05.21",
    history:[2200,2200,2100,2100,2100,2100,1990], shipment:[480,500,520,510,530,540,560] },
  { code:"V002", name:"피망 5kg",             cat:"야채",  type:"관리품목", price:8400, prev:8200, applied:"2026.04.18",
    history:[7800,8000,8200,8200,8200,8200,8400], shipment:[120,130,135,140,138,145,150] },
  { code:"V003", name:"옥수수콘 3kg",         cat:"야채",  type:"범용상품", price:5600, prev:5600, applied:"2026.02.05",
    history:[5400,5400,5600,5600,5600,5600,5600], shipment:[80,82,85,90,88,92,95] },
  { code:"D001", name:"도우 L (50개입)",      cat:"도우",  type:"관리품목", price:28000, prev:28000, applied:"2026.03.01",
    history:[27000,27500,28000,28000,28000,28000,28000], shipment:[600,640,680,720,740,780,820] },
  { code:"D002", name:"도우 R (60개입)",      cat:"도우",  type:"관리품목", price:24000, prev:24000, applied:"2026.03.01",
    history:[23000,23500,24000,24000,24000,24000,24000], shipment:[280,300,320,310,330,340,350] },
  { code:"D003", name:"씬도우 (40개입)",      cat:"도우",  type:"범용상품", price:19000, prev:19000, applied:"2026.03.01",
    history:[18500,19000,19000,19000,19000,19000,19000], shipment:[140,150,155,160,158,165,170] },
  { code:"P001", name:"피자박스 L (100개)",   cat:"포장",  type:"관리품목", price:14800, prev:15200, applied:"2026.05.05",
    history:[15500,15200,15200,15200,15200,15200,14800], shipment:[700,740,780,820,850,890,920] },
  { code:"P002", name:"피자박스 R (100개)",   cat:"포장",  type:"관리품목", price:12000, prev:12000, applied:"2026.02.10",
    history:[11500,12000,12000,12000,12000,12000,12000], shipment:[320,340,360,350,370,380,390] },
  { code:"P003", name:"피자스티커 (200개)",   cat:"포장",  type:"범용상품", price:4200, prev:4200, applied:"2026.01.15",
    history:[4200,4200,4200,4200,4200,4200,4200], shipment:[1200,1280,1360,1400,1440,1500,1560] },
  { code:"B001", name:"콜라 1.25L (12병)",    cat:"음료",  type:"관리품목", price:18000, prev:17800, applied:"2026.04.22",
    history:[17500,17500,17800,17800,17800,17800,18000], shipment:[280,300,310,320,335,345,360] },
  { code:"B002", name:"사이다 1.25L (12병)",  cat:"음료",  type:"관리품목", price:18000, prev:17800, applied:"2026.04.22",
    history:[17500,17500,17800,17800,17800,17800,18000], shipment:[180,190,195,200,210,215,220] },
];

/* Mini sparkline for inline cells */
function MiniSpark({ data, color = "var(--accent)", width = 80, height = 28 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = (width - 4) / (data.length - 1);
  const pts = data.map((v, i) => [2 + i*step, height - 2 - ((v - min)/span) * (height - 4)]);
  const d = pts.map((p,i) => (i?"L":"M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const trend = data[data.length-1] - data[0];
  const c = trend > 0 ? "var(--negative)" : trend < 0 ? "var(--positive)" : "var(--text-3)";
  return (
    <svg width={width} height={height} style={{display:"block"}}>
      <path d={d} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.2" fill={c}/>
    </svg>
  );
}

/* ============================================================
   Page: 제때 상품 가격 비교
============================================================ */
function JettePriceComparePage() {
  const [cat, setCat] = useJT("all");
  const [search, setSearch] = useJT("");
  const [sortKey, setSortKey] = useJT("pct");
  const [sortDir, setSortDir] = useJT("desc");
  const [expanded, setExpanded] = useJT(null);

  const enriched = JETTE_PRODUCTS.map(p => {
    const diff = p.price - p.prev;
    const pct  = p.prev ? (diff / p.prev) * 100 : 0;
    return { ...p, diff, pct };
  });

  const summary = {
    up:    enriched.filter(p => p.diff > 0).length,
    down:  enriched.filter(p => p.diff < 0).length,
    same:  enriched.filter(p => p.diff === 0).length,
    total: enriched.length,
  };

  const filtered = useJTMemo(() => {
    let r = enriched;
    if (cat !== "all") r = r.filter(p => p.cat === cat);
    if (search.trim()) r = r.filter(p => (p.name + p.code).includes(search.trim()));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") return va.localeCompare(vb, "ko") * dir;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }, [cat, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const SortIco = ({ active, dir }) => (
    <span className={"sort-ico " + (active ? "active" : "")}>
      {active ? (dir === "asc" ? "▲" : "▼") : "▾"}
    </span>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["제때상품관리", "제때 상품 가격 비교"]}
        title="제때 상품 가격 비교"
        sub="최신 단가와 직전 단가를 비교해요. 원가계산 모듈은 이 데이터를 단일 기준으로 사용해요."
        actions={<>
          <button className="btn">onClick={()=>showToast("CSV 파일이 저장됐어요", "ok")}<Icon.download style={{width:14, height:14}}/>CSV 내보내기</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>가격 파일 업로드</button>
        </>}
      />

      {/* 최신 반영 안내 */}
      <div className="info-banner info-accent">
        <div className="info-banner-ico" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <b>최신 제때 단가: 2026.05.21 반영</b> · 이번 업데이트로 {summary.up}개 인상 / {summary.down}개 인하. 원가표가 자동으로 재계산돼요.
        </div>
      </div>

      {/* 변동 요약 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">가격 인상</div>
          <div className="stat-value num" style={{color:"var(--negative)"}}>{summary.up}<span className="unit">개</span></div>
          <div className="stat-foot">전체 {summary.total}개 중 {((summary.up/summary.total)*100).toFixed(0)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">가격 인하</div>
          <div className="stat-value num" style={{color:"var(--positive)"}}>{summary.down}<span className="unit">개</span></div>
          <div className="stat-foot">전체 {summary.total}개 중 {((summary.down/summary.total)*100).toFixed(0)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">변동 없음</div>
          <div className="stat-value num" style={{color:"var(--text-1)"}}>{summary.same}<span className="unit">개</span></div>
          <div className="stat-foot">전 단가 대비 동일</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">관리 대상 품목</div>
          <div className="stat-value num">{summary.total}<span className="unit">개</span></div>
          <div className="stat-foot">관리품목 {enriched.filter(p=>p.type==="관리품목").length}개 · 범용상품 {enriched.filter(p=>p.type==="범용상품").length}개</div>
        </div>
      </div>

      <FilterBar
        search={search} onSearch={setSearch}
        chips={JETTE_CATS.map(c => ({
          label: c.label,
          count: c.id === "all" ? enriched.length : enriched.filter(x => x.cat === c.id).length,
          active: cat === c.id,
          onClick: () => setCat(c.id)
        }))}
      />

      {/* 가격 비교 테이블 */}
      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:90}} onClick={()=>toggleSort("code")} className="sortable">
                제품코드 <SortIco active={sortKey==="code"} dir={sortDir}/>
              </th>
              <th onClick={()=>toggleSort("name")} className="sortable">
                제품명 <SortIco active={sortKey==="name"} dir={sortDir}/>
              </th>
              <th style={{width:90}} onClick={()=>toggleSort("cat")} className="sortable">
                재료군 <SortIco active={sortKey==="cat"} dir={sortDir}/>
              </th>
              <th style={{width:90}}>분류</th>
              <th style={{width:130, textAlign:"right"}} onClick={()=>toggleSort("price")} className="sortable">
                현재 단가 <SortIco active={sortKey==="price"} dir={sortDir}/>
              </th>
              <th style={{width:130, textAlign:"right"}}>이전 단가</th>
              <th style={{width:120, textAlign:"right"}} onClick={()=>toggleSort("pct")} className="sortable">
                변동률 <SortIco active={sortKey==="pct"} dir={sortDir}/>
              </th>
              <th style={{width:120}} onClick={()=>toggleSort("applied")} className="sortable">
                적용일 <SortIco active={sortKey==="applied"} dir={sortDir}/>
              </th>
              <th style={{width:32}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isExp = expanded === p.code;
              return (
                <React.Fragment key={p.code}>
                  <tr onClick={()=>setExpanded(isExp ? null : p.code)} className={isExp ? "row-expanded" : ""}>
                    <td className="muted mono">{p.code}</td>
                    <td className="cell-name"><div className="menu-name">{p.name}</div></td>
                    <td>
                      <span className="cat-pill" style={{
                        background: (JETTE_CATS.find(c=>c.id===p.cat)?.color||"#3182F6") + "20",
                        color: JETTE_CATS.find(c=>c.id===p.cat)?.color || "var(--accent-text)"
                      }}>{p.cat}</span>
                    </td>
                    <td>
                      <span className={"chip " + (p.type === "관리품목" ? "" : "")} style={{
                        background: p.type === "관리품목" ? "var(--accent-soft)" : "var(--surface-2)",
                        color: p.type === "관리품목" ? "var(--accent-text)" : "var(--text-3)"
                      }}>{p.type}</span>
                    </td>
                    <td className="num right" style={{fontWeight: 800}}>{fmtKRW(p.price)}<span className="unit">원</span></td>
                    <td className="num right muted">{fmtKRW(p.prev)}<span className="unit">원</span></td>
                    <td className="num right">
                      {p.pct === 0
                        ? <span className="muted">—</span>
                        : <span style={{color: p.pct > 0 ? "var(--negative)" : "var(--positive)", fontWeight: 700}}>
                            {p.pct > 0 ? "▲" : "▼"} {Math.abs(p.pct).toFixed(1)}%
                          </span>}
                    </td>
                    <td className="muted mono" style={{fontSize:12}}>{p.applied}</td>
                    <td>
                      <span className={"chev-toggle " + (isExp ? "open" : "")}>
                        <Icon.chevDown style={{width:14, height:14, color:"var(--text-4)"}}/>
                      </span>
                    </td>
                  </tr>
                  {isExp && (
                    <tr className="variant-expanded">
                      <td colSpan={9}>
                        <div className="variant-wrap">
                          <div style={{display:"grid", gridTemplateColumns:"1fr auto", gap:24, alignItems:"center"}}>
                            <div>
                              <div className="variant-title">{p.name} · 최근 7회 단가 변동</div>
                              <div style={{display:"flex", gap:12, marginTop:6, fontSize:12, color:"var(--text-3)"}}>
                                <span>최저 <b className="num" style={{color:"var(--positive)"}}>{fmtKRW(Math.min(...p.history))}원</b></span>
                                <span>최고 <b className="num" style={{color:"var(--negative)"}}>{fmtKRW(Math.max(...p.history))}원</b></span>
                                <span>평균 <b className="num" style={{color:"var(--text-1)"}}>{fmtKRW(Math.round(p.history.reduce((s,v)=>s+v,0)/p.history.length))}원</b></span>
                              </div>
                            </div>
                            <MiniSpark data={p.history} width={220} height={48} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ============================================================
   Page: 제때 범용상품 출고량
============================================================ */
function JetteShipmentPage() {
  const [cat, setCat] = useJT("all");
  const [type, setType] = useJT("all"); // all | 관리품목 | 범용상품
  const [search, setSearch] = useJT("");
  const [sortKey, setSortKey] = useJT("total");
  const [sortDir, setSortDir] = useJT("desc");

  const enriched = JETTE_PRODUCTS.map(p => {
    const total = p.shipment.reduce((s,v)=>s+v,0);
    const last  = p.shipment[p.shipment.length-1];
    const first = p.shipment[0];
    const pct   = first > 0 ? ((last - first) / first) * 100 : 0;
    return { ...p, total, last, pct };
  });

  const filtered = useJTMemo(() => {
    let r = enriched;
    if (cat !== "all")  r = r.filter(p => p.cat === cat);
    if (type !== "all") r = r.filter(p => p.type === type);
    if (search.trim()) r = r.filter(p => (p.name + p.code).includes(search.trim()));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") return va.localeCompare(vb, "ko") * dir;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }, [cat, type, search, sortKey, sortDir]);

  const totalShip = filtered.reduce((s,p)=>s+p.total, 0);
  const avgShip   = filtered.length ? Math.round(totalShip / filtered.length) : 0;
  const maxItem   = filtered.length ? filtered.reduce((m,p)=>p.total>m.total?p:m, filtered[0]) : null;
  const targetTotal = enriched.length;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const SortIco = ({ active, dir }) => (
    <span className={"sort-ico " + (active ? "active" : "")}>
      {active ? (dir === "asc" ? "▲" : "▼") : "▾"}
    </span>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["제때상품관리", "제때 범용상품 출고량"]}
        title="제때 범용상품 출고량"
        sub={`지정한 ${targetTotal}개 대상 제품의 출고량을 집계해요. 대상 외 제품은 자동으로 제외돼요.`}
        actions={<>
          <button className="btn">onClick={()=>showToast("CSV 파일이 저장됐어요", "ok")}<Icon.download style={{width:14, height:14}}/>CSV 내보내기</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>출고량 업로드</button>
        </>}
      />

      {/* 요약 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">총 출고량</div>
          <div className="stat-value num">{fmtKRW(totalShip)}<span className="unit">건</span></div>
          <div className="stat-foot">최근 7회 합계</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">평균 출고량</div>
          <div className="stat-value num">{fmtKRW(avgShip)}<span className="unit">건</span></div>
          <div className="stat-foot">필터된 {filtered.length}개 제품 평균</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">최대 출고 제품</div>
          <div className="stat-value" style={{fontSize:16, lineHeight:1.3}}>{maxItem ? maxItem.name : "—"}</div>
          <div className="stat-foot num" style={{color:"var(--accent-text)", fontWeight:700}}>{maxItem ? fmtKRW(maxItem.total) + "건" : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">대상 제품</div>
          <div className="stat-value num">{filtered.length}<span className="unit">/{targetTotal}</span></div>
          <div className="stat-foot">관리품목 {enriched.filter(p=>p.type==="관리품목").length}개 · 범용상품 {enriched.filter(p=>p.type==="범용상품").length}개</div>
        </div>
      </div>

      {/* 분류 토글 (관리품목/범용상품) */}
      <div className="filter-bar">
        <div className="period-tabs">
          <button className={type==="all"?"active":""} onClick={()=>setType("all")}>전체</button>
          <button className={type==="관리품목"?"active":""} onClick={()=>setType("관리품목")}>관리품목</button>
          <button className={type==="범용상품"?"active":""} onClick={()=>setType("범용상품")}>범용상품</button>
        </div>
        <div className="filter-search" style={{marginLeft:"auto"}}>
          <Icon.search style={{width:16, height:16, color:"var(--text-3)"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="제품명·코드 검색" />
        </div>
      </div>

      {/* 카테고리 칩 */}
      <FilterBar
        chips={JETTE_CATS.map(c => ({
          label: c.label,
          count: c.id === "all" ? enriched.length : enriched.filter(x => x.cat === c.id).length,
          active: cat === c.id,
          onClick: () => setCat(c.id)
        }))}
      />

      {/* 출고량 테이블 */}
      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:90}} onClick={()=>toggleSort("code")} className="sortable">
                제품코드 <SortIco active={sortKey==="code"} dir={sortDir}/>
              </th>
              <th onClick={()=>toggleSort("name")} className="sortable">
                제품명 <SortIco active={sortKey==="name"} dir={sortDir}/>
              </th>
              <th style={{width:80}} onClick={()=>toggleSort("cat")} className="sortable">
                재료군 <SortIco active={sortKey==="cat"} dir={sortDir}/>
              </th>
              <th style={{width:90}}>분류</th>
              <th style={{width:130, textAlign:"right"}} onClick={()=>toggleSort("total")} className="sortable">
                총 출고량 <SortIco active={sortKey==="total"} dir={sortDir}/>
              </th>
              <th style={{width:110, textAlign:"right"}} onClick={()=>toggleSort("last")} className="sortable">
                최근 출고 <SortIco active={sortKey==="last"} dir={sortDir}/>
              </th>
              <th style={{width:100}}>추이</th>
              <th style={{width:110, textAlign:"right"}} onClick={()=>toggleSort("pct")} className="sortable">
                증감률 <SortIco active={sortKey==="pct"} dir={sortDir}/>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.code}>
                <td className="muted mono">{p.code}</td>
                <td className="cell-name"><div className="menu-name">{p.name}</div></td>
                <td>
                  <span className="cat-pill" style={{
                    background: (JETTE_CATS.find(c=>c.id===p.cat)?.color||"#3182F6") + "20",
                    color: JETTE_CATS.find(c=>c.id===p.cat)?.color || "var(--accent-text)"
                  }}>{p.cat}</span>
                </td>
                <td>
                  <span className="chip" style={{
                    background: p.type === "관리품목" ? "var(--accent-soft)" : "var(--surface-2)",
                    color: p.type === "관리품목" ? "var(--accent-text)" : "var(--text-3)"
                  }}>{p.type}</span>
                </td>
                <td className="num right" style={{fontWeight: 800}}>{fmtKRW(p.total)}<span className="unit">건</span></td>
                <td className="num right">{fmtKRW(p.last)}<span className="unit">건</span></td>
                <td><MiniSpark data={p.shipment} width={80} height={28}/></td>
                <td className="num right">
                  <span style={{color: p.pct >= 0 ? "var(--positive)" : "var(--negative)", fontWeight: 700}}>
                    {p.pct >= 0 ? "▲" : "▼"} {Math.abs(p.pct).toFixed(1)}%
                  </span>
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
   Page: 제때 상품 관리 설정
============================================================ */
function JetteSettingsPage() {
  const [alertUp,   setAlertUp]   = useJT(5);
  const [alertDown, setAlertDown] = useJT(5);
  const [autoNewProduct, setAutoNewProduct] = useJT(false);
  const [autoRecalc, setAutoRecalc] = useJT(true);

  // 70개 대상 제품 — 데모는 위 23개 + 가상 추가 47개
  const targets = JETTE_PRODUCTS;
  const targetGroups = JETTE_CATS.slice(1).map(c => ({
    ...c,
    count: targets.filter(p => p.cat === c.id).length,
    managed: targets.filter(p => p.cat === c.id && p.type === "관리품목").length,
  }));

  const [productSearch, setProductSearch] = useJT("");
  const filteredProducts = productSearch.trim()
    ? targets.filter(p => (p.name + p.code).includes(productSearch.trim()))
    : targets;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["제때상품관리", "제때 상품 관리 설정"]}
        title="제때 상품 관리 설정"
        sub="대상 제품 목록과 가격 변동 알림·자동 처리 정책을 관리해요."
      />

      {/* 상단: 알림 임계값 */}
      <div className="card threshold-card" style={{gridTemplateColumns:"1fr 1fr"}}>
        <div>
          <div className="threshold-title">가격 인상 알림 임계값</div>
          <div className="threshold-desc">
            이 비율 이상 <b>인상</b>되면 홈 대시보드에 빨간 알림이 떠요.
          </div>
          <div className="threshold-bar" style={{marginTop: 12}}>
            <input type="range" min="1" max="20" step="1"
              value={alertUp} onChange={e=>setAlertUp(parseInt(e.target.value))}/>
            <div className="threshold-val num" style={{color:"var(--negative)"}}>+{alertUp}<span className="unit">%↑</span></div>
          </div>
        </div>
        <div>
          <div className="threshold-title">가격 인하 알림 임계값</div>
          <div className="threshold-desc">
            이 비율 이상 <b>인하</b>되면 홈 대시보드에 초록 알림이 떠요.
          </div>
          <div className="threshold-bar" style={{marginTop: 12}}>
            <input type="range" min="1" max="20" step="1"
              value={alertDown} onChange={e=>setAlertDown(parseInt(e.target.value))}/>
            <div className="threshold-val num" style={{color:"var(--positive)"}}>−{alertDown}<span className="unit">%↓</span></div>
          </div>
        </div>
      </div>

      {/* 자동 처리 정책 */}
      <div className="card setting-card">
        <div className="section-h">자동 처리 정책</div>

        <div className="setting-row">
          <div className="setting-meta">
            <div className="setting-name">단가 업데이트 시 원가표 자동 재계산</div>
            <div className="setting-desc">
              제때 단가가 변경되면 모든 원가표를 자동으로 다시 계산해요. (CLAUDE.md 정책)
            </div>
          </div>
          <button className={"switch " + (autoRecalc ? "on" : "")} onClick={()=>setAutoRecalc(v=>!v)}>
            <span className="switch-thumb"></span>
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-meta">
            <div className="setting-name">신규 제품 자동 등록</div>
            <div className="setting-desc">
              업로드 파일에서 발견된 새 제품을 자동으로 대상 목록에 추가해요. 끄면 수동 승인 필요.
            </div>
          </div>
          <button className={"switch " + (autoNewProduct ? "on" : "")} onClick={()=>setAutoNewProduct(v=>!v)}>
            <span className="switch-thumb"></span>
          </button>
        </div>
      </div>

      {/* 재료군별 대상 제품 요약 */}
      <div className="card cat-overview">
        <div className="card-header" style={{marginBottom: 14}}>
          <div>
            <div className="card-title">재료군별 대상 제품</div>
            <div className="card-sub">총 {targets.length}개 · 관리품목 {targets.filter(p=>p.type==="관리품목").length}개 / 범용상품 {targets.filter(p=>p.type==="범용상품").length}개</div>
          </div>
        </div>
        <div className="cat-grid">
          {targetGroups.map(c => (
            <div key={c.id} className="cat-card" style={{cursor:"default"}}>
              <div className="cat-card-head">
                <div className="cat-dot" style={{background: c.color}}></div>
                <div className="cat-name">{c.label}</div>
                <div className="cat-share num">{c.count}<span className="unit">개</span></div>
              </div>
              <div className="cat-total" style={{fontSize:13, color:"var(--text-2)"}}>
                관리품목 <b>{c.managed}</b> · 범용 <b>{c.count - c.managed}</b>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 대상 제품 목록 */}
      <div className="card mng-card">
        <div className="mng-head">
          <div>
            <div className="card-title">대상 제품 목록</div>
            <div className="card-sub">집계 대상이 되는 제품 — 대상 외 제품은 자동으로 제외돼요</div>
          </div>
          <div className="filter-search" style={{width: 240}}>
            <Icon.search style={{width:14, height:14, color:"var(--text-3)"}}/>
            <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="제품명·코드 검색"/>
          </div>
        </div>
        <div className="mng-count">
          <span className="mng-count-num num">{filteredProducts.length}</span>
          <span className="mng-count-label">개 표시 중 / 전체 {targets.length}개</span>
        </div>
        <div style={{maxHeight: 360, overflowY: "auto", borderTop: "1px solid var(--divider)"}}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width:90}}>제품코드</th>
                <th>제품명</th>
                <th style={{width:90}}>재료군</th>
                <th style={{width:100}}>분류</th>
                <th style={{width:60}}></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.code}>
                  <td className="muted mono">{p.code}</td>
                  <td className="cell-name"><div className="menu-name">{p.name}</div></td>
                  <td>
                    <span className="cat-pill" style={{
                      background: (JETTE_CATS.find(c=>c.id===p.cat)?.color||"#3182F6") + "20",
                      color: JETTE_CATS.find(c=>c.id===p.cat)?.color || "var(--accent-text)"
                    }}>{p.cat}</span>
                  </td>
                  <td>
                    <span className="chip" style={{
                      background: p.type === "관리품목" ? "var(--accent-soft)" : "var(--surface-2)",
                      color: p.type === "관리품목" ? "var(--accent-text)" : "var(--text-3)"
                    }}>{p.type}</span>
                  </td>
                  <td>
                    <button className="link" style={{color:"var(--negative)", fontSize:12}}>제외</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card warn-card">
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">제때 가격 데이터 단일 기준 원칙</div>
          <div className="warn-text">
            원가계산 모듈은 이 페이지의 최신 단가만 참조해요. 원가계산 탭에서 가격을 별도 업로드하지 마세요. (CLAUDE.md 정책)
          </div>
        </div>
      </div>
    </main>
  );
}

Object.assign(window.Pages, {
  JettePriceComparePage,
  JetteShipmentPage,
  JetteSettingsPage,
});
