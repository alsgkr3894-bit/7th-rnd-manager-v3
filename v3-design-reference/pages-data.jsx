/* global React, Icon, fmtKRW, fmtShort */
const { useState: usePgState, useMemo: usePgMemo } = React;

/* ============================================================
   PageHeader — 모든 세부 페이지의 상단 영역
============================================================ */
function PageHeader({ title, sub, breadcrumb, actions }) {
  return (
    <div className="page-head">
      {breadcrumb && (
        <div className="breadcrumb">
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon.chevRight style={{width:12, height:12, color:"var(--text-4)"}}/>}
              <span className={i === breadcrumb.length - 1 ? "bc-current" : "bc-link"}>{b}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="page-head-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {sub && <div className="page-sub">{sub}</div>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   FilterBar — 검색 + 필터 칩 + 기간
============================================================ */
function FilterBar({ search, onSearch, chips, dateRange }) {
  return (
    <div className="filter-bar">
      {onSearch && (
        <div className="filter-search">
          <Icon.search style={{width:16, height:16, color:"var(--text-3)"}}/>
          <input
            value={search || ""}
            onChange={e => onSearch(e.target.value)}
            placeholder="검색"
          />
        </div>
      )}
      {chips && (
        <div className="filter-chips">
          {chips.map((c, i) => (
            <button key={i}
              className={"chip " + (c.active ? "active" : "")}
              onClick={c.onClick}>
              {c.label}
              {c.count != null && <span className="chip-count">{c.count}</span>}
            </button>
          ))}
        </div>
      )}
      {dateRange && (
        <button className="filter-date">
          <Icon.doc style={{width:14, height:14}}/>
          {dateRange}
          <Icon.chevDown style={{width:14, height:14, color:"var(--text-3)"}}/>
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Page: 메뉴 판매량 순위 (집계 단위: 년/월, 11개 카테고리, 변형 펼침)
============================================================ */

const RANK_CATEGORIES = [
  { id: "all",        label: "전체",         color: "#3182F6" },
  { id: "피자",       label: "피자",         color: "#3182F6" },
  { id: "1인피자",    label: "1인피자",      color: "#10B981" },
  { id: "사이드",     label: "사이드",       color: "#F59E0B" },
  { id: "사이드(소스)", label: "사이드(소스)", color: "#EF4444" },
  { id: "엣지&도우",  label: "엣지&도우",    color: "#8B5CF6" },
  { id: "세트메뉴",   label: "세트메뉴",     color: "#EC4899" },
  { id: "추가토핑",   label: "추가토핑",     color: "#06B6D4" },
  { id: "하프앤하프", label: "하프앤하프",   color: "#84CC16" },
  { id: "음료",       label: "음료",         color: "#F97316" },
  { id: "행사",       label: "행사",         color: "#A78BFA" },
];

// 메뉴 데이터 — 각 메뉴는 변형(L/R/기타 등)을 가짐. 합산 = 판매량
const MENUS_BY_PERIOD = {
  "2026.05": [
    { name: "슈퍼콤비네이션", cat: "피자",       variants: { L: 12507, R: 5290, 기타: 14653 }, costRate: 29.4, prev: 28900 },
    { name: "포테이토피자",    cat: "피자",       variants: { L: 7100,  R: 3800, 기타: 8200 },  costRate: 38.2, prev: 18100 },
    { name: "불고기피자",      cat: "피자",       variants: { L: 6280,  R: 2920, 기타: 7860 },  costRate: 28.2, prev: 17600 },
    { name: "고르곤졸라",      cat: "피자",       variants: { L: 5640,  R: 2110, 기타: 6210 },  costRate: 36.8, prev: 12480 },
    { name: "새우파티",        cat: "피자",       variants: { L: 5200,  R: 2330, 기타: 5710 },  costRate: 35.5, prev: 13780 },
    { name: "하와이안",        cat: "피자",       variants: { L: 4470,  R: 1640, 기타: 4980 },  costRate: 30.1, prev: 10470 },
    { name: "쉬림프골드",      cat: "피자",       variants: { L: 3920,  R: 1450, 기타: 4180 },  costRate: 31.7, prev: 8910 },
    { name: "치즈피자",        cat: "피자",       variants: { L: 3680,  R: 1340, 기타: 3920 },  costRate: 25.8, prev: 8740 },
    { name: "트러플 페퍼로니", cat: "피자",       variants: { L: 2410,  R: 980,  기타: 2820 },  costRate: 33.4, prev: 4980 },
    { name: "콤비 1인",        cat: "1인피자",    variants: { 단품: 2980, 세트: 1240 },          costRate: 28.6, prev: 4210 },
    { name: "포테이토 1인",    cat: "1인피자",    variants: { 단품: 1840, 세트: 920 },           costRate: 30.2, prev: 2640 },
    { name: "오븐스파게티",    cat: "사이드",     variants: { 일반: 2750 },                       costRate: 30.8, prev: 2640 },
    { name: "치즈스틱",        cat: "사이드",     variants: { 일반: 2410 },                       costRate: 24.1, prev: 2380 },
    { name: "치즈볼",          cat: "사이드",     variants: { 일반: 1840 },                       costRate: 26.5, prev: 0 },
    { name: "갈릭소스",        cat: "사이드(소스)", variants: { 일반: 4280 },                     costRate: 12.4, prev: 4100 },
    { name: "핫소스",          cat: "사이드(소스)", variants: { 일반: 3120 },                     costRate: 14.2, prev: 2980 },
    { name: "치즈크러스트",    cat: "엣지&도우",  variants: { L: 8420, R: 2010 },                 costRate: 41.2, prev: 9810 },
    { name: "골드스윗크러스트", cat: "엣지&도우", variants: { L: 5240, R: 1380 },                 costRate: 43.5, prev: 6240 },
    { name: "씬도우",          cat: "엣지&도우",  variants: { L: 3210 },                          costRate: 22.8, prev: 3010 },
    { name: "패밀리 박스 L",   cat: "세트메뉴",   variants: { L: 1840 },                          costRate: 29.3, prev: 1620 },
    { name: "더블 박스",       cat: "세트메뉴",   variants: { L: 1240 },                          costRate: 31.5, prev: 1100 },
    { name: "페퍼로니 추가",   cat: "추가토핑",   variants: { 일반: 6840 },                       costRate: 18.4, prev: 6420 },
    { name: "치즈 추가",       cat: "추가토핑",   variants: { 일반: 5230 },                       costRate: 16.2, prev: 5010 },
    { name: "하프 콤비&불고기", cat: "하프앤하프", variants: { L: 1820, R: 640 },                 costRate: 30.8, prev: 2100 },
    { name: "하프 포테이토&치즈", cat: "하프앤하프", variants: { L: 1450, R: 520 },               costRate: 32.1, prev: 1840 },
    { name: "콜라 1.25L",      cat: "음료",       variants: { 일반: 4680 },                       costRate: 35.8, prev: 4510 },
    { name: "사이다 1.25L",    cat: "음료",       variants: { 일반: 2810 },                       costRate: 36.2, prev: 2740 },
    { name: "5월 가정의 달 세트", cat: "행사",    variants: { L: 920, R: 380 },                  costRate: 34.6, prev: 0 },
    { name: "어버이날 한정",   cat: "행사",       variants: { L: 480, R: 210 },                  costRate: 36.2, prev: 0 },
  ],
};

const totalOf = (m) => Object.values(m.variants).reduce((s, v) => s + v, 0);

function MenuSalesRankPage() {
  const [periodMode, setPeriodMode] = usePgState("month"); // month | year
  const [year, setYear] = usePgState(2026);
  const [month, setMonth] = usePgState(5);
  const [cat, setCat] = usePgState("all");
  const [sortKey, setSortKey] = usePgState("qty");
  const [sortDir, setSortDir] = usePgState("desc");
  const [search, setSearch] = usePgState("");
  const [expanded, setExpanded] = usePgState(null);

  const periodKey = `${year}.${String(month).padStart(2,"0")}`;
  const periodLabel = periodMode === "year" ? `${year}년` : `${year}년 ${month}월`;
  const menus = MENUS_BY_PERIOD["2026.05"]; // demo: 모든 기간이 같은 데이터 사용

  // 카테고리별 합계 (전체 비중 계산용)
  const allTotal = menus.reduce((s, m) => s + totalOf(m), 0);

  const counted = menus.map(m => {
    const qty = totalOf(m);
    const prev = m.prev;
    const delta = prev > 0 ? ((qty - prev) / prev) * 100 : null;
    return { ...m, qty, delta, share: (qty / allTotal) * 100 };
  });

  // 카테고리별 미니 순위 (카드용)
  const catSummary = RANK_CATEGORIES.slice(1).map(c => {
    const list = counted.filter(m => m.cat === c.id);
    const total = list.reduce((s, m) => s + m.qty, 0);
    const top = [...list].sort((a,b) => b.qty - a.qty).slice(0, 3);
    return { ...c, total, share: (total / allTotal) * 100, top };
  }).sort((a, b) => b.total - a.total);

  // 메인 테이블 필터링·정렬
  const filtered = usePgMemo(() => {
    let r = counted;
    if (cat !== "all") r = r.filter(x => x.cat === cat);
    if (search.trim()) r = r.filter(x => x.name.includes(search.trim()));

    // 판매 비중 재계산:
    //  - 카테고리 "전체"일 때: 전체 판매량 대비
    //  - 특정 카테고리 선택 시: 해당 카테고리 내 판매량 대비
    const scope = r.reduce((s, m) => s + m.qty, 0) || 1;
    r = r.map(m => ({ ...m, share: (m.qty / scope) * 100 }));

    r = [...r].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va = a[sortKey], vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
    return r;
  }, [cat, search, sortKey, sortDir, counted]);

  const visibleTotal = filtered.reduce((s, m) => s + m.qty, 0);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const SortIco = ({ active, dir }) => (
    <span className={"sort-ico-wrap " + (active ? dir : "")}>
      {active
        ? dir === "asc"
          ? <span className="asc-tri" />
          : <span className="desc-tri" />
        : <><span className="neutral-tri-up" /><span className="neutral-tri-down" /></>}
    </span>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴 판매량", "판매량 순위"]}
        title="메뉴판매량 순위"
        sub={`${periodLabel} 기준 · 최신 제때 단가 2026.05.21 반영`}
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>CSV 내보내기</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>판매량 업로드</button>
        </>}
      />

      {/* 기간 선택 */}
      <div className="period-bar">
        <div className="period-tabs">
          <button className={periodMode==="month"?"active":""} onClick={()=>setPeriodMode("month")}>월 단위</button>
          <button className={periodMode==="year"?"active":""} onClick={()=>setPeriodMode("year")}>년 단위</button>
        </div>
        <div className="period-picker">
          <select className="period-select num" value={year} onChange={e=>setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          {periodMode === "month" && (
            <select className="period-select num" value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
              {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          )}
          <div className="period-disp" style={{marginLeft: 12}}>
            <div className="period-side">
              <div className="period-label" style={{color:"var(--accent-text)"}}>● 집계 기간</div>
              <div className="period-val">{periodLabel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리별 판매 비중 + 미니 순위 */}
      <div className="card cat-overview">
        <div className="card-header" style={{marginBottom: 14}}>
          <div>
            <div className="card-title">카테고리별 판매 비중</div>
            <div className="card-sub">상위 카테고리 · 카테고리별 TOP 3</div>
          </div>
          <div style={{fontSize:12, color:"var(--text-3)"}}>
            총 <span className="num" style={{fontWeight:800, color:"var(--text-1)"}}>{fmtKRW(allTotal)}</span>개
          </div>
        </div>
        {/* 비중 바 (가로 스택) */}
        <div className="share-stack">
          {catSummary.map(c => (
            <div key={c.id} className="share-seg"
              style={{flex: c.share || 0.01, background: c.color, opacity: c.total > 0 ? 1 : 0.15}}
              title={`${c.label} ${c.share.toFixed(1)}%`}>
            </div>
          ))}
        </div>
        {/* 카테고리별 미니 순위 그리드 */}
        <div className="cat-grid">
          {catSummary.map(c => (
            <button key={c.id} className="cat-card" onClick={()=>setCat(c.id)}>
              <div className="cat-card-head">
                <div className="cat-dot" style={{background: c.color}}></div>
                <div className="cat-name">{c.label}</div>
                <div className="cat-share num">{c.share.toFixed(1)}<span className="unit">%</span></div>
              </div>
              <div className="cat-total num">{fmtKRW(c.total)}<span className="unit">개</span></div>
              <div className="cat-top">
                {c.top.length === 0
                  ? <div className="cat-empty">판매 없음</div>
                  : c.top.map((m, i) => (
                      <div className="cat-top-row" key={m.name}>
                        <span className="cat-top-rank">{i+1}</span>
                        <span className="cat-top-name">{m.name}</span>
                        <span className="cat-top-qty num">{fmtKRW(m.qty)}</span>
                      </div>
                    ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 요약 통계 (총 판매량 / 평균 원가율 — 매출/메뉴수 제외) */}
      <div className="stat-row stat-2col">
        <div className="stat-card">
          <div className="stat-label">{cat === "all" ? "전체" : cat} 판매량</div>
          <div className="stat-value num">{fmtKRW(visibleTotal)}<span className="unit">개</span></div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{width: `${(visibleTotal/allTotal)*100}%`}}></div>
          </div>
          <div className="stat-foot">전체의 {((visibleTotal/allTotal)*100).toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">평균 원가율</div>
          <div className="stat-value num">{(filtered.reduce((s,r)=>s+r.costRate,0)/(filtered.length||1)).toFixed(1)}<span className="unit">%</span></div>
          <div className="stat-foot" style={{color: "var(--text-3)"}}>
            {filtered.filter(r => r.costRate >= 35).length}개 메뉴가 35% 초과
          </div>
        </div>
      </div>

      <FilterBar
        search={search} onSearch={setSearch}
        chips={RANK_CATEGORIES.map(c => ({
          label: c.label,
          count: c.id === "all" ? counted.length : counted.filter(x => x.cat === c.id).length,
          active: cat === c.id,
          onClick: () => setCat(c.id)
        }))}
      />

      {/* 메인 테이블 */}
      <div className="card table-card">
        <table className="data-table stagger-rows">
          <thead>
            <tr>
              <th style={{width:60}}>순위</th>
              <th>메뉴명</th>
              <th style={{width:120}}>카테고리</th>
              <th style={{width:140, textAlign:"right"}} onClick={()=>toggleSort("qty")} className="sortable sort-th">
                판매량 <SortIco active={sortKey==="qty"} dir={sortDir}/>
              </th>
              <th style={{width:140, textAlign:"right"}} onClick={()=>toggleSort("share")} className="sortable sort-th">
                {cat === "all" ? "판매 비중" : `${cat} 내 비중`} <SortIco active={sortKey==="share"} dir={sortDir}/>
              </th>
              <th style={{width:110, textAlign:"right"}} onClick={()=>toggleSort("costRate")} className="sortable sort-th">
                원가율 <SortIco active={sortKey==="costRate"} dir={sortDir}/>
              </th>
              <th style={{width:110, textAlign:"right"}}>전월 대비</th>
              <th style={{width:32}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const isExpanded = expanded === r.name;
              const isRisk = r.costRate >= 35;
              const variants = Object.entries(r.variants);
              return (
                <React.Fragment key={r.name}>
                  <tr onClick={()=>setExpanded(isExpanded ? null : r.name)}
                      className={isExpanded ? "row-expanded" : ""}>
                    <td>
                      <span className={"rank-pill " + (idx < 3 ? "top" : "")}>{idx + 1}</span>
                    </td>
                    <td className="cell-name">
                      <div className="menu-name">{r.name}</div>
                      {isRisk && <span className="tag-risk">원가율 ⚠</span>}
                      <span className="variant-hint">{variants.length}개 규격 ▾</span>
                    </td>
                    <td><span className="cat-pill">{r.cat}</span></td>
                    <td className="num right">{fmtKRW(r.qty)}<span className="unit">개</span></td>
                    <td className="num right">
                      <div className="share-cell">
                        <div className="share-mini">
                          <div className="share-mini-fill" style={{width: `${Math.min(r.share, 100)}%`, background: RANK_CATEGORIES.find(c=>c.id===r.cat)?.color || "var(--accent)"}}></div>
                        </div>
                        <span>{r.share.toFixed(1)}<span className="unit">%</span></span>
                      </div>
                    </td>
                    <td className="num right">
                      <span className={isRisk ? "risk-num" : ""}>{r.costRate.toFixed(1)}%</span>
                    </td>
                    <td className="num right">
                      {r.delta == null
                        ? <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>신규</span>
                        : <span style={{fontSize:13, fontWeight:700, color: r.delta>=0?"var(--positive)":"var(--negative)", whiteSpace:"nowrap"}}>
                            {r.delta>=0?"▲":"▼"} {Math.abs(r.delta).toFixed(1)}%
                          </span>}
                    </td>
                    <td>
                      <span className={"chev-toggle " + (isExpanded ? "open" : "")}>
                        <Icon.chevDown style={{width:14, height:14, color:"var(--text-4)"}}/>
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="variant-expanded">
                      <td colSpan={8}>
                        <div className="variant-wrap">
                          <div className="variant-title">{r.name} · 규격별 판매량</div>
                          <div className="variant-rows">
                            {variants.map(([label, qty]) => {
                              const share = (qty / r.qty) * 100;
                              return (
                                <div className="variant-row" key={label}>
                                  <div className="variant-label">{r.name}<span className="variant-suffix">{label}</span></div>
                                  <div className="variant-bar">
                                    <div className="variant-bar-fill" style={{width: `${share}%`, background: RANK_CATEGORIES.find(c=>c.id===r.cat)?.color || "var(--accent)"}}></div>
                                  </div>
                                  <div className="variant-qty num">{fmtKRW(qty)}<span className="unit">개</span></div>
                                  <div className="variant-share num">{share.toFixed(1)}<span className="unit">%</span></div>
                                </div>
                              );
                            })}
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
   Page: 메뉴 미매칭 관리
============================================================ */
function MenuSalesUnmatchedPage() {
  const items = [
    { id: 1, raw: "슈콤L",              count: 142, suggested: "슈퍼콤비네이션 L",   confidence: 0.96, date: "2026.04 업로드" },
    { id: 2, raw: "포테토 L",           count: 87,  suggested: "포테이토피자 L",     confidence: 0.91, date: "2026.04 업로드" },
    { id: 3, raw: "치즈피자 (라지)",    count: 64,  suggested: "치즈피자 L",         confidence: 0.88, date: "2026.04 업로드" },
    { id: 4, raw: "신메뉴-와규쉬림프",  count: 28,  suggested: null,                  confidence: 0,    date: "2026.05 업로드" },
  ];
  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴 판매량", "메뉴 미매칭 관리"]}
        title="메뉴 미매칭 관리"
        sub="판매량 데이터와 메뉴 목록이 일치하지 않는 항목 — 자동 매칭하거나 새 메뉴로 등록할 수 있어요."
      />

      <div className="info-banner">
        <div className="info-banner-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <b>4건 조치 필요</b> — 매칭하지 않으면 판매량 집계에서 제외돼요. 신뢰도 90% 이상은 자동 매칭이 가능합니다.
        </div>
      </div>

      <div className="card table-card">
        {items.map((it, i) => (
          <div className="unmatched-row" key={it.id}>
            <div className="unmatched-left">
              <div className="raw-label">엑셀 원본</div>
              <div className="raw-name">{it.raw}</div>
              <div className="raw-meta">{it.count}건 · {it.date}</div>
            </div>
            <div className="unmatched-arrow"><Icon.chevRight style={{width:18, height:18}}/></div>
            <div className="unmatched-right">
              {it.suggested ? (
                <>
                  <div className="raw-label">
                    추천 매칭
                    <span className={"confidence " + (it.confidence >= 0.9 ? "high" : "mid")}>
                      신뢰도 {Math.round(it.confidence * 100)}%
                    </span>
                  </div>
                  <div className="raw-name">{it.suggested}</div>
                </>
              ) : (
                <>
                  <div className="raw-label">추천 매칭</div>
                  <div className="raw-name muted">매칭 가능 항목 없음 — 신메뉴로 등록 필요</div>
                </>
              )}
            </div>
            <div className="unmatched-actions">
              {it.suggested ? (
                <>
                  <button className="btn sm primary">매칭 적용</button>
                  <button className="btn sm">다른 메뉴 선택</button>
                </>
              ) : (
                <button className="btn sm primary">신메뉴로 등록</button>
              )}
              <button className="btn sm ghost">건너뛰기</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ============================================================
   Page: 식자재 원가표
============================================================ */
function CostIngredientPricePage() {
  const items = [
    { code: "C001", name: "모짜렐라치즈 2kg",     productName: "모짜렐라치즈",      taxInclude: 7680, prev: 7400,  pkg: 2000, unit: "g", tax: "과세",  status: "linked" },
    { code: "C002", name: "체다치즈 1kg",          productName: "체다치즈",          taxInclude: 5940, prev: 5940,  pkg: 1000, unit: "g", tax: "과세",  status: "linked" },
    { code: "S001", name: "피자소스 5L",           productName: "피자소스",          taxInclude: 18500, prev: 18000, pkg: 5000, unit: "g", tax: "과세",  status: "linked" },
    { code: "T001", name: "페퍼로니 1kg",          productName: "페퍼로니",          taxInclude: 12100, prev: 12100, pkg: 1000, unit: "g", tax: "과세",  status: "linked" },
    { code: "V001", name: "양파 10kg",             productName: "양파",              taxInclude: 1990, prev: 2100,  pkg: 10000, unit: "g", tax: "면세", status: "linked" },
    { code: "V002", name: "올리브 3kg",            productName: "올리브",            taxInclude: 24200, prev: 24200, pkg: 3000, unit: "g", tax: "과세",  status: "linked" },
    { code: "T002", name: "새우(냉동) 1kg",        productName: "새우",              taxInclude: 19800, prev: 18600, pkg: 1000, unit: "g", tax: "과세",  status: "linked" },
    { code: "T003", name: "고르곤졸라치즈 500g",   productName: "고르곤졸라치즈",     taxInclude: 14300, prev: 13400, pkg: 500, unit: "g", tax: "과세",  status: "linked" },
    { code: "D001", name: "도우 L (50개입)",       productName: "도우 L",             taxInclude: 28000, prev: 28000, pkg: 50, unit: "개", tax: "과세",  status: "linked" },
    { code: "—",     name: "스트링치즈",            productName: "스트링치즈",        taxInclude: null,  prev: null,  pkg: null, unit: "—", tax: "—",     status: "unlinked" },
    { code: "—",     name: "트러플오일",            productName: "트러플오일",        taxInclude: null,  prev: null,  pkg: null, unit: "—", tax: "—",     status: "unlinked" },
  ];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", "식자재 원가표"]}
        title="식자재 원가표"
        sub="제때 가격 비교 모듈의 최신 단가를 단일 기준으로 사용해요."
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>양식 다운로드</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>단가표 업로드</button>
        </>}
      />

      <div className="info-banner info-accent">
        <div className="info-banner-ico" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <b>최신 제때 단가: 2026.05.21 반영</b> · 이번 업데이트로 5개 품목 단가가 변경되었어요. 미연동 품목 2건 확인 필요.
        </div>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:80}}>제품코드</th>
              <th>제품명 / 제때 제품명</th>
              <th style={{width:80}}>과세</th>
              <th style={{width:160, textAlign:"right"}}>부가세포함단가</th>
              <th style={{width:120, textAlign:"right"}}>g·개당 단가</th>
              <th style={{width:120, textAlign:"right"}}>전 단가 대비</th>
              <th style={{width:120}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const unitPrice = it.taxInclude && it.pkg ? it.taxInclude / it.pkg : null;
              const diff = (it.taxInclude && it.prev) ? ((it.taxInclude - it.prev) / it.prev) * 100 : null;
              return (
                <tr key={it.name}>
                  <td className="muted mono">{it.code}</td>
                  <td className="cell-name">
                    <div className="menu-name">{it.name}</div>
                    <div className="ing-product muted">{it.productName}</div>
                  </td>
                  <td>
                    {it.tax !== "—" ? <span className={"cat-pill " + (it.tax === "면세" ? "neutral" : "")}>{it.tax}</span> : <span className="muted">—</span>}
                  </td>
                  <td className="num right">
                    {it.taxInclude != null
                      ? <><span>{fmtKRW(it.taxInclude)}</span><span className="unit">원</span></>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="num right">
                    {unitPrice != null
                      ? <><span>{unitPrice.toFixed(2)}</span><span className="unit">원/{it.unit}</span></>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="num right">
                    {diff != null && diff !== 0 ? (
                      <span style={{color: diff > 0 ? "var(--negative)" : "var(--positive)", fontWeight: 700}}>
                        {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(1)}%
                      </span>
                    ) : <span className="muted">변동 없음</span>}
                  </td>
                  <td>
                    {it.status === "linked"
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

window.Pages = { MenuSalesRankPage, MenuSalesUnmatchedPage, CostIngredientPricePage, PageHeader, FilterBar, RANK_CATEGORIES };
