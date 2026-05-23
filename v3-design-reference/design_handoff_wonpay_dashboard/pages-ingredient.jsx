/* global React, Icon, Pages, fmtKRW */
const { useState: useIG, useMemo: useIGMemo } = React;
const { PageHeader, FilterBar } = window.Pages;

/* ============================================================
   식자재 데이터 (제때 상품 23개를 마스터 카탈로그로 활용 + 메타데이터)
============================================================ */
const ING_CATS = [
  { id: "all",    label: "전체",  color: "#3182F6" },
  { id: "치즈",   label: "치즈",  color: "#F59E0B" },
  { id: "토핑",   label: "토핑",  color: "#EF4444" },
  { id: "소스",   label: "소스",  color: "#10B981" },
  { id: "도우",   label: "도우",  color: "#8B5CF6" },
  { id: "야채",   label: "야채",  color: "#84CC16" },
  { id: "포장",   label: "포장",  color: "#6B7280" },
  { id: "음료",   label: "음료",  color: "#F97316" },
];

const INGREDIENTS = [
  { code:"C001", name:"모짜렐라치즈",      cat:"치즈",  unit:"g", pkg:2000,  unitPrice:3.84,  menus:23, lastChange:"2026.05.21", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"C002", name:"체다치즈",          cat:"치즈",  unit:"g", pkg:1000,  unitPrice:5.94,  menus:6,  lastChange:"2026.04.05", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"C003", name:"고르곤졸라치즈",    cat:"치즈",  unit:"g", pkg:500,   unitPrice:28.60, menus:2,  lastChange:"2026.05.21", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"C004", name:"파마산치즈",        cat:"치즈",  unit:"g", pkg:500,   unitPrice:37.80, menus:1,  lastChange:"2026.03.15", linked:true,  type:"범용상품", added:"2024.06.21" },
  { code:"—",    name:"스트링치즈",        cat:"치즈",  unit:"g", pkg:null,  unitPrice:null,  menus:3,  lastChange:"—",          linked:false, type:"관리품목", added:"2026.05.10" },
  { code:"S001", name:"피자소스",          cat:"소스",  unit:"g", pkg:5000,  unitPrice:3.70,  menus:20, lastChange:"2026.05.10", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"S002", name:"갈릭소스",          cat:"소스",  unit:"ml",pkg:1000,  unitPrice:6.80,  menus:1,  lastChange:"2026.02.20", linked:true,  type:"관리품목", added:"2024.04.18" },
  { code:"S003", name:"핫소스",            cat:"소스",  unit:"ml",pkg:500,   unitPrice:8.40,  menus:1,  lastChange:"2026.05.18", linked:true,  type:"범용상품", added:"2024.07.02" },
  { code:"—",    name:"트러플오일",        cat:"소스",  unit:"ml",pkg:null,  unitPrice:null,  menus:1,  lastChange:"—",          linked:false, type:"관리품목", added:"2026.04.28" },
  { code:"T001", name:"페퍼로니",          cat:"토핑",  unit:"g", pkg:1000,  unitPrice:12.10, menus:8,  lastChange:"2026.03.20", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"T002", name:"새우",              cat:"토핑",  unit:"g", pkg:1000,  unitPrice:19.80, menus:3,  lastChange:"2026.05.21", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"T003", name:"불고기",            cat:"토핑",  unit:"g", pkg:1000,  unitPrice:14.20, menus:4,  lastChange:"2026.04.30", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"T004", name:"올리브",            cat:"토핑",  unit:"g", pkg:3000,  unitPrice:8.07,  menus:5,  lastChange:"2026.01.10", linked:true,  type:"범용상품", added:"2024.03.10" },
  { code:"T005", name:"베이컨",            cat:"토핑",  unit:"g", pkg:1000,  unitPrice:13.50, menus:5,  lastChange:"2026.05.21", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"T006", name:"옥수수콘",          cat:"토핑",  unit:"g", pkg:3000,  unitPrice:5.60,  menus:4,  lastChange:"2026.02.05", linked:true,  type:"범용상품", added:"2024.05.14" },
  { code:"T007", name:"파인애플",          cat:"토핑",  unit:"g", pkg:2500,  unitPrice:4.20,  menus:1,  lastChange:"2025.11.10", linked:true,  type:"범용상품", added:"2024.05.14" },
  { code:"T008", name:"한우 슬라이스",     cat:"토핑",  unit:"g", pkg:500,   unitPrice:120.0, menus:0,  lastChange:"2026.05.12", linked:true,  type:"관리품목", added:"2026.05.12" },
  { code:"V001", name:"양파",              cat:"야채",  unit:"g", pkg:10000, unitPrice:0.199, menus:18, lastChange:"2026.05.21", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"V002", name:"피망",              cat:"야채",  unit:"g", pkg:5000,  unitPrice:1.68,  menus:8,  lastChange:"2026.04.18", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"V003", name:"옥수수콘 (캔)",     cat:"야채",  unit:"g", pkg:3000,  unitPrice:1.87,  menus:0,  lastChange:"2025.08.22", linked:true,  type:"범용상품", added:"2024.05.14" },
  { code:"D001", name:"도우 L",            cat:"도우",  unit:"개", pkg:50,   unitPrice:560,   menus:8,  lastChange:"2026.03.01", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"D002", name:"도우 R",            cat:"도우",  unit:"개", pkg:60,   unitPrice:400,   menus:8,  lastChange:"2026.03.01", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"D003", name:"씬도우",            cat:"도우",  unit:"개", pkg:40,   unitPrice:475,   menus:2,  lastChange:"2026.03.01", linked:true,  type:"범용상품", added:"2024.05.14" },
  { code:"P001", name:"피자박스 L",        cat:"포장",  unit:"개", pkg:100,  unitPrice:148,   menus:8,  lastChange:"2026.05.05", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"P002", name:"피자박스 R",        cat:"포장",  unit:"개", pkg:100,  unitPrice:120,   menus:8,  lastChange:"2026.02.10", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"P003", name:"피자스티커",        cat:"포장",  unit:"개", pkg:200,  unitPrice:21,    menus:16, lastChange:"2026.01.15", linked:true,  type:"범용상품", added:"2024.03.10" },
  { code:"B001", name:"콜라 1.25L",        cat:"음료",  unit:"병", pkg:12,   unitPrice:1500,  menus:3,  lastChange:"2026.04.22", linked:true,  type:"관리품목", added:"2024.03.10" },
  { code:"B002", name:"사이다 1.25L",      cat:"음료",  unit:"병", pkg:12,   unitPrice:1500,  menus:2,  lastChange:"2026.04.22", linked:true,  type:"관리품목", added:"2024.03.10" },
];

/* daysAgo helper */
const daysSince = (dateStr) => {
  if (!dateStr || dateStr === "—") return null;
  const today = new Date("2026-05-22");
  const past = new Date(dateStr.replace(/\./g, "-"));
  return Math.round((today - past) / (1000 * 60 * 60 * 24));
};

/* ============================================================
   식자재 리스트
============================================================ */
function IngredientListPage() {
  const [cat, setCat]       = useIG("all");
  const [type, setType]     = useIG("all");
  const [search, setSearch] = useIG("");
  const [sortKey, setSortKey] = useIG("name");
  const [sortDir, setSortDir] = useIG("asc");

  const filtered = useIGMemo(() => {
    let r = INGREDIENTS;
    if (cat !== "all")  r = r.filter(x => x.cat === cat);
    if (type !== "all") r = r.filter(x => x.type === type);
    if (search.trim()) r = r.filter(x => (x.name + x.code).includes(search.trim()));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") return va.localeCompare(vb, "ko") * dir;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }, [cat, type, search, sortKey, sortDir]);

  const stats = {
    total:    INGREDIENTS.length,
    linked:   INGREDIENTS.filter(x => x.linked).length,
    unlinked: INGREDIENTS.filter(x => !x.linked).length,
    inUse:    INGREDIENTS.filter(x => x.menus > 0).length,
    unused:   INGREDIENTS.filter(x => x.menus === 0).length,
  };

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
        breadcrumb={["식자재", "식자재 리스트"]}
        title="식자재 리스트"
        sub="전체 식자재 마스터 카탈로그 — 단가·사용 메뉴·매핑 상태를 한 곳에서 관리해요."
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>CSV 내보내기</button>
          <button className="btn primary"><Icon.plus style={{width:14, height:14}}/>식자재 추가</button>
        </>}
      />

      {/* 요약 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">전체 식자재</div>
          <div className="stat-value num">{stats.total}<span className="unit">개</span></div>
          <div className="stat-foot">관리품목 {INGREDIENTS.filter(x=>x.type==="관리품목").length} · 범용상품 {INGREDIENTS.filter(x=>x.type==="범용상품").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">연동 식자재</div>
          <div className="stat-value num" style={{color:"var(--positive)"}}>{stats.linked}<span className="unit">개</span></div>
          <div className="stat-foot">{((stats.linked/stats.total)*100).toFixed(0)}% 단가 매핑 완료</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">미연동</div>
          <div className="stat-value num" style={{color:"var(--warn)"}}>{stats.unlinked}<span className="unit">개</span></div>
          <div className="stat-foot">단가표 매칭 필요</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">불용 재료</div>
          <div className="stat-value num" style={{color:"var(--text-2)"}}>{stats.unused}<span className="unit">개</span></div>
          <div className="stat-foot">30일 이상 사용 메뉴 없음</div>
        </div>
      </div>

      {/* 분류 토글 */}
      <div className="filter-bar">
        <div className="period-tabs">
          <button className={type==="all"?"active":""} onClick={()=>setType("all")}>전체</button>
          <button className={type==="관리품목"?"active":""} onClick={()=>setType("관리품목")}>관리품목</button>
          <button className={type==="범용상품"?"active":""} onClick={()=>setType("범용상품")}>범용상품</button>
        </div>
        <div className="filter-search" style={{marginLeft:"auto"}}>
          <Icon.search style={{width:16, height:16, color:"var(--text-3)"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="재료명·코드 검색" />
        </div>
      </div>

      <FilterBar
        chips={ING_CATS.map(c => ({
          label: c.label,
          count: c.id === "all" ? INGREDIENTS.length : INGREDIENTS.filter(x => x.cat === c.id).length,
          active: cat === c.id,
          onClick: () => setCat(c.id)
        }))}
      />

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:90}} onClick={()=>toggleSort("code")} className="sortable">
                제품코드 <SortIco active={sortKey==="code"} dir={sortDir}/>
              </th>
              <th onClick={()=>toggleSort("name")} className="sortable">
                재료명 <SortIco active={sortKey==="name"} dir={sortDir}/>
              </th>
              <th style={{width:90}} onClick={()=>toggleSort("cat")} className="sortable">
                카테고리 <SortIco active={sortKey==="cat"} dir={sortDir}/>
              </th>
              <th style={{width:90}}>분류</th>
              <th style={{width:80, textAlign:"right"}}>단위</th>
              <th style={{width:140, textAlign:"right"}} onClick={()=>toggleSort("unitPrice")} className="sortable">
                g·개당 단가 <SortIco active={sortKey==="unitPrice"} dir={sortDir}/>
              </th>
              <th style={{width:120, textAlign:"right"}} onClick={()=>toggleSort("menus")} className="sortable">
                사용 메뉴 <SortIco active={sortKey==="menus"} dir={sortDir}/>
              </th>
              <th style={{width:130}} onClick={()=>toggleSort("lastChange")} className="sortable">
                마지막 변경 <SortIco active={sortKey==="lastChange"} dir={sortDir}/>
              </th>
              <th style={{width:100}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(x => {
              const catColor = ING_CATS.find(c=>c.id===x.cat)?.color || "#3182F6";
              return (
                <tr key={x.code + x.name}>
                  <td className="muted mono">{x.code}</td>
                  <td className="cell-name"><div className="menu-name">{x.name}</div></td>
                  <td>
                    <span className="cat-pill" style={{
                      background: catColor + "20",
                      color: catColor
                    }}>{x.cat}</span>
                  </td>
                  <td>
                    <span className="chip" style={{
                      background: x.type === "관리품목" ? "var(--accent-soft)" : "var(--surface-2)",
                      color: x.type === "관리품목" ? "var(--accent-text)" : "var(--text-3)"
                    }}>{x.type}</span>
                  </td>
                  <td className="num right muted">{x.unit}</td>
                  <td className="num right">
                    {x.unitPrice != null
                      ? <>{x.unitPrice.toLocaleString("ko-KR", {maximumFractionDigits:2})}<span className="unit">원/{x.unit}</span></>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="num right" style={{fontWeight: 700, color: x.menus === 0 ? "var(--text-4)" : "var(--text-1)"}}>
                    {x.menus}<span className="unit">개</span>
                  </td>
                  <td className="muted mono" style={{fontSize:12}}>{x.lastChange}</td>
                  <td>
                    {x.linked
                      ? <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:"var(--positive)",display:"inline-block"}}></span>
                          연동
                        </span>
                      : <span className="chip" style={{background:"var(--warn-soft)", color:"var(--warn)"}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:"var(--warn)",display:"inline-block"}}></span>
                          미연동
                        </span>}
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
   식자재 이슈
============================================================ */
function IngredientIssuesPage() {
  // 이슈 자동 추출
  const unlinked    = INGREDIENTS.filter(x => !x.linked);
  const unused      = INGREDIENTS.filter(x => x.menus === 0);
  const staleRefs   = INGREDIENTS.filter(x => { const d = daysSince(x.lastChange); return d != null && d > 180; });
  // 가격 급변동 (데모: 모짜렐라/새우/베이컨/양파 — 변경 폭이 큰 항목)
  const sharpChange = ["C001","T002","T005","V001","P001","C003"];
  const priceSpike  = INGREDIENTS.filter(x => sharpChange.includes(x.code));
  const newItems    = INGREDIENTS.filter(x => { const d = daysSince(x.added); return d != null && d < 30; });

  const groups = [
    {
      severity: "critical", label: "즉시 조치 필요",
      desc: "오계산을 방지하기 위해 우선적으로 처리해야 해요",
      issues: [
        { type: "unlinked",  title: "단가 미연동",  desc: "최신 제때 단가와 매칭되지 않은 식자재",  items: unlinked, action: "단가표 매칭" },
        { type: "unit",      title: "단위 불일치 의심", desc: "세부 원가표 단위와 식자재 단위가 다른 항목", items: [], action: "단위 확인" },
      ],
    },
    {
      severity: "warning", label: "검토 필요",
      desc: "조치하면 좋지만 즉시는 아니에요",
      issues: [
        { type: "spike",   title: "가격 급변동 (±5% 이상)", desc: "최근 단가 업데이트에서 5% 이상 변동된 항목",  items: priceSpike, action: "원가 영향 검토" },
        { type: "stale",   title: "180일 이상 단가 미변경",  desc: "오랫동안 단가가 그대로인 항목 — 최신화 확인",   items: staleRefs,  action: "단가 재확인" },
      ],
    },
    {
      severity: "info", label: "정보",
      desc: "참고용 — 데이터 정리에 활용해주세요",
      issues: [
        { type: "unused",  title: "사용 메뉴 없음", desc: "현재 어떤 메뉴에도 사용되지 않는 식자재", items: unused,   action: "보관 / 삭제 결정" },
        { type: "new",     title: "최근 30일 신규 등록", desc: "최근에 추가된 식자재 — 단가·사용 메뉴 확인", items: newItems, action: "확인 완료" },
      ],
    },
  ];

  const sevMeta = {
    critical: { color: "var(--negative)", bg: "var(--negative-soft)", ico: <Icon.alert style={{width:18, height:18}}/> },
    warning:  { color: "var(--warn)",     bg: "var(--warn-soft)",     ico: <Icon.alert style={{width:18, height:18}}/> },
    info:     { color: "var(--text-2)",   bg: "var(--surface-2)",     ico: <Icon.alert style={{width:18, height:18}}/> },
  };

  const totalCount = groups.reduce((s, g) => s + g.issues.reduce((ss, i) => ss + i.items.length, 0), 0);
  const criticalCount = groups[0].issues.reduce((s, i) => s + i.items.length, 0);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["식자재", "식자재 이슈"]}
        title="식자재 이슈"
        sub={`총 ${totalCount}건 — 즉시 조치 ${criticalCount}건 · 검토 ${groups[1].issues.reduce((s,i)=>s+i.items.length,0)}건 · 정보 ${groups[2].issues.reduce((s,i)=>s+i.items.length,0)}건`}
        actions={<button className="btn"><Icon.download style={{width:14, height:14}}/>이슈 리포트 다운로드</button>}
      />

      {/* 요약 카드 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label" style={{color:"var(--negative)"}}>● 즉시 조치 필요</div>
          <div className="stat-value num" style={{color:"var(--negative)"}}>{criticalCount}<span className="unit">건</span></div>
          <div className="stat-foot">오계산 방지 우선</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{color:"var(--warn)"}}>● 검토 필요</div>
          <div className="stat-value num" style={{color:"var(--warn)"}}>{groups[1].issues.reduce((s,i)=>s+i.items.length,0)}<span className="unit">건</span></div>
          <div className="stat-foot">단가 영향·재확인</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{color:"var(--text-2)"}}>● 정보</div>
          <div className="stat-value num">{groups[2].issues.reduce((s,i)=>s+i.items.length,0)}<span className="unit">건</span></div>
          <div className="stat-foot">불용 재료·신규 등록</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">데이터 정합성</div>
          <div className="stat-value num" style={{color: criticalCount === 0 ? "var(--positive)" : "var(--warn)"}}>
            {(((INGREDIENTS.length - criticalCount) / INGREDIENTS.length) * 100).toFixed(0)}<span className="unit">%</span>
          </div>
          <div className="stat-foot">정상 상태 비율</div>
        </div>
      </div>

      {/* 이슈 그룹들 */}
      {groups.map((g, gi) => {
        const meta = sevMeta[g.severity];
        const groupCount = g.issues.reduce((s,i)=>s+i.items.length, 0);
        return (
          <div key={gi}>
            <div className="issue-group-head" style={{color: meta.color}}>
              <span className="issue-sev-dot" style={{background: meta.color}}></span>
              <span className="issue-group-label">{g.label}</span>
              <span className="issue-group-count">{groupCount}건</span>
              <span className="issue-group-desc">{g.desc}</span>
            </div>
            <div className="issue-cards">
              {g.issues.map((iss, ii) => (
                <div className="card issue-card" key={ii}>
                  <div className="issue-card-head">
                    <div className="issue-card-ico" style={{background: meta.bg, color: meta.color}}>{meta.ico}</div>
                    <div style={{flex:1, minWidth:0}}>
                      <div className="issue-card-title">{iss.title}</div>
                      <div className="issue-card-sub">{iss.desc}</div>
                    </div>
                    <div className="issue-card-count num" style={{color: meta.color}}>
                      {iss.items.length}<span className="unit">건</span>
                    </div>
                  </div>
                  {iss.items.length === 0 ? (
                    <div className="issue-empty">
                      <Icon.check style={{width:16, height:16, color:"var(--positive)"}}/>
                      <span>해당 항목 없음</span>
                    </div>
                  ) : (
                    <div className="issue-items">
                      {iss.items.slice(0, 5).map(it => (
                        <div className="issue-item" key={it.code + it.name}>
                          <div className="issue-item-meta">
                            <div className="issue-item-name">{it.name}</div>
                            <div className="issue-item-info">
                              <span className="mono muted">{it.code}</span>
                              <span className="muted">·</span>
                              <span>{it.cat}</span>
                              {iss.type === "unused" && it.lastChange !== "—" && <><span className="muted">·</span><span>마지막 변경 {it.lastChange}</span></>}
                              {iss.type === "spike" && <><span className="muted">·</span><span style={{color:"var(--negative)", fontWeight:700}}>{(["C001","C003"].includes(it.code) ? "▲ 인상" : it.code === "V001" ? "▼ 인하" : "▲ 인상")}</span></>}
                              {iss.type === "new" && <><span className="muted">·</span><span style={{color:"var(--accent-text)", fontWeight:700}}>{daysSince(it.added)}일 전 등록</span></>}
                              {iss.type === "stale" && <><span className="muted">·</span><span style={{color:"var(--warn)", fontWeight:700}}>{daysSince(it.lastChange)}일 경과</span></>}
                            </div>
                          </div>
                          <button className="btn sm">{iss.action}</button>
                        </div>
                      ))}
                      {iss.items.length > 5 && (
                        <button className="link" style={{padding:"8px 0", textAlign:"center", width:"100%"}}>
                          +{iss.items.length - 5}건 더 보기
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </main>
  );
}

Object.assign(window.Pages, {
  IngredientListPage,
  IngredientIssuesPage,
});
