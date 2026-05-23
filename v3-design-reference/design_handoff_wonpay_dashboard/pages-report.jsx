/* global React, Icon, Pages, fmtKRW, fmtShort, Sparkline, AreaChart */
const { useState: useRpt, useMemo: useRptMemo } = React;
const { PageHeader, FilterBar } = window.Pages;

/* ============================================================
   공통 — 보고서 메타데이터
============================================================ */
const REPORT_KINDS = {
  sales: {
    id: "sales",
    title: "판매량 보고서",
    sub: "월/년 단위 메뉴 판매량 + 카테고리별 비중 + 전월 대비 증감.",
    color: "#3182F6",
    pages: 8,
    icon: "chart",
  },
  price: {
    id: "price",
    title: "제때 가격 보고서",
    sub: "제때 단가 변동 — 인상·인하 품목, 원가 영향, 추세.",
    color: "#E1101F",
    pages: 6,
    icon: "alert",
  },
  shipment: {
    id: "shipment",
    title: "제때 출고량 보고서",
    sub: "범용/관리품목 출고량 추세와 카테고리별 합계.",
    color: "#1D766F",
    pages: 5,
    icon: "box",
  },
  compare: {
    id: "compare",
    title: "판매량 비교 보고서",
    sub: "두 기간을 나란히 — 메뉴·카테고리·금액 단위로 비교.",
    color: "#7C3AED",
    pages: 7,
    icon: "calc",
  },
  cost: {
    id: "cost",
    title: "원가계산 보고서",
    sub: "5개 카테고리 종합 원가표를 한 장에 — 평균 원가율·위험 메뉴 자동 정리.",
    color: "#F59E0B",
    pages: 9,
    icon: "calc",
  },
};

/* 최근 생성된 보고서 — 데모용 */
const REPORT_HISTORY = [
  { id: "RPT-2026-025", kind: "cost",      name: "2026년 4월 원가계산 보고서",        period: "2026.04",          author: "민혁 책임", created: "2026.05.03 11:08", size: "4.1 MB", status: "완료", views: 24, fav: true,  links: 2 },
  { id: "RPT-2026-024", kind: "sales",     name: "2026년 4월 판매량 보고서",        period: "2026.04",          author: "민혁 책임", created: "2026.05.02 09:14", size: "3.2 MB", status: "완료", views: 38, fav: true,  links: 1 },
  { id: "RPT-2026-023", kind: "price",     name: "5월 3주차 제때 가격 보고서",       period: "2026.05.14~05.20", author: "민혁 책임", created: "2026.05.21 10:02", size: "1.4 MB", status: "완료", views: 12, fav: false, links: 1 },
  { id: "RPT-2026-022", kind: "compare",   name: "Q1 vs Q2 판매량 비교 (피자)",      period: "2026.Q1 vs Q2",    author: "지영 매니저", created: "2026.04.30 16:48", size: "2.1 MB", status: "완료", views: 8,  fav: false, links: 0 },
  { id: "RPT-2026-021", kind: "shipment",  name: "2026년 4월 제때 출고량 보고서",   period: "2026.04",          author: "민혁 책임", created: "2026.05.01 09:32", size: "1.8 MB", status: "완료", views: 6,  fav: false, links: 0 },
  { id: "RPT-2026-020", kind: "sales",     name: "2026년 3월 판매량 보고서",         period: "2026.03",          author: "지영 매니저", created: "2026.04.02 11:20", size: "3.0 MB", status: "완료", views: 41, fav: false, links: 0 },
  { id: "RPT-2026-019", kind: "price",     name: "5월 2주차 제때 가격 보고서",       period: "2026.05.07~05.13", author: "민혁 책임", created: "2026.05.14 09:58", size: "1.3 MB", status: "완료", views: 15, fav: false, links: 0 },
  { id: "RPT-2026-018", kind: "compare",   name: "전년 동월 대비 비교 (1인피자)",     period: "2025.04 vs 2026.04", author: "민혁 책임", created: "2026.05.05 14:11", size: "2.4 MB", status: "완료", views: 18, fav: true,  links: 1 },
  { id: "RPT-2026-017", kind: "shipment",  name: "5월 1주차 제때 출고량",            period: "2026.05.01~05.07", author: "지영 매니저", created: "2026.05.08 17:33", size: "1.1 MB", status: "완료", views: 4,  fav: false, links: 0 },
];

const KIND_CHIP = {
  sales:    { bg: "var(--accent-soft)",    color: "var(--accent-text)",  label: "판매량" },
  price:    { bg: "var(--negative-soft)",  color: "var(--negative)",     label: "가격" },
  shipment: { bg: "var(--positive-soft)",  color: "var(--positive)",     label: "출고량" },
  compare:  { bg: "#F0EBFF",                color: "#6B3FCB",             label: "비교" },
  cost:     { bg: "var(--warn-soft)",       color: "var(--warn)",         label: "원가" },
};

/* ============================================================
   Page: 보고서센터 (랜딩)
============================================================ */
function ReportLandingPage({ onNav }) {
  const [kindFilter, setKindFilter] = useRpt("all");
  const [search, setSearch] = useRpt("");
  const [favOnly, setFavOnly] = useRpt(false);
  const [favSet, setFavSet] = useRpt(() => new Set(REPORT_HISTORY.filter(r=>r.fav).map(r=>r.id)));
  const [shareTarget, setShareTarget] = useRpt(null);
  const [previewTarget, setPreviewTarget] = useRpt(null);
  const [scheduleOpen, setScheduleOpen] = useRpt(false);

  const toggleFav = (id) => setFavSet(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const list = REPORT_HISTORY.filter(r => {
    if (kindFilter !== "all" && r.kind !== kindFilter) return false;
    if (favOnly && !favSet.has(r.id)) return false;
    if (search.trim() && !(r.name + r.id + r.author).includes(search.trim())) return false;
    return true;
  });

  const stats = {
    total: REPORT_HISTORY.length,
    thisMonth: REPORT_HISTORY.filter(r => r.created.startsWith("2026.05")).length,
    auto: 6,
    sharedLinks: REPORT_HISTORY.reduce((s, r) => s + r.links, 0),
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["보고서센터"]}
        title="보고서센터"
        sub="판매량·가격·출고량·비교·원가 보고서를 한 곳에서 생성하고 보관해요."
        actions={<>
          <button className="btn" onClick={()=>setScheduleOpen(true)}>
            <Icon.gear style={{width:14, height:14}}/>예약 설정
          </button>
          <button className="btn primary"><Icon.plus style={{width:14, height:14}}/>새 보고서 생성</button>
        </>}
      />

      {/* 요약 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">전체 보고서</div>
          <div className="stat-value num">{stats.total}<span className="unit">건</span></div>
          <div className="stat-foot">최근 30일</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">이번 달 생성</div>
          <div className="stat-value num" style={{color:"var(--accent-text)"}}>{stats.thisMonth}<span className="unit">건</span></div>
          <div className="stat-foot">2026.05 기준</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">자동 예약</div>
          <div className="stat-value num">{stats.auto}<span className="unit">건</span></div>
          <div className="stat-foot">
            <button className="link" onClick={()=>setScheduleOpen(true)}>예약 관리 →</button>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">활성 공유 링크</div>
          <div className="stat-value num" style={{color:"#6B3FCB"}}>{stats.sharedLinks}<span className="unit">개</span></div>
          <div className="stat-foot">7일 이내 만료 1건</div>
        </div>
      </div>

      {/* 5종 보고서 카드 */}
      <div className="report-kind-grid report-kind-grid-5">
        {Object.values(REPORT_KINDS).map(k => {
          const IconEl = Icon[k.icon] || Icon.doc;
          const to = k.id === "compare" ? "report-menu-sales-compare" : `report-${k.id}`;
          return (
            <button key={k.id} className="report-kind-card" onClick={() => onNav(to)}>
              <div className="report-kind-ico" style={{background: k.color + "1A", color: k.color}}>
                <IconEl style={{width:22, height:22}}/>
              </div>
              <div className="report-kind-body">
                <div className="report-kind-title">{k.title}</div>
                <div className="report-kind-sub">{k.sub}</div>
              </div>
              <div className="report-kind-foot">
                <span className="report-kind-meta">
                  최근 {REPORT_HISTORY.filter(r=>r.kind===k.id).length}건
                </span>
                <Icon.chevRight style={{width:14, height:14, color:"var(--text-4)"}}/>
              </div>
            </button>
          );
        })}
      </div>

      {/* 최근 보고서 목록 */}
      <FilterBar
        search={search} onSearch={setSearch}
        chips={[
          { id:"all",      label:"전체" },
          { id:"sales",    label:"판매량" },
          { id:"cost",     label:"원가" },
          { id:"price",    label:"가격" },
          { id:"shipment", label:"출고량" },
          { id:"compare",  label:"비교" },
        ].map(c => ({
          label: c.label,
          count: c.id === "all" ? REPORT_HISTORY.length : REPORT_HISTORY.filter(r=>r.kind===c.id).length,
          active: kindFilter === c.id,
          onClick: () => setKindFilter(c.id),
        }))}
      />

      <div className="report-list-toolbar">
        <button className={"report-toolbar-pill " + (favOnly ? "active" : "")} onClick={()=>setFavOnly(v=>!v)}>
          <span style={{color:"#F59E0B"}}>★</span>
          즐겨찾기만
          <span className="muted">({favSet.size})</span>
        </button>
        <div className="muted" style={{fontSize:12, marginLeft:"auto"}}>{list.length}건 표시</div>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width: 36}}></th>
              <th style={{width: 120}}>보고서 ID</th>
              <th>제목</th>
              <th style={{width: 80}}>유형</th>
              <th style={{width: 160}}>대상 기간</th>
              <th style={{width: 110}}>작성자</th>
              <th style={{width: 140}}>생성일시</th>
              <th style={{width: 110}}>활동</th>
              <th style={{width: 220}}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => {
              const chip = KIND_CHIP[r.kind];
              const isFav = favSet.has(r.id);
              return (
                <tr key={r.id}>
                  <td>
                    <button
                      className={"fav-btn " + (isFav ? "on" : "")}
                      onClick={()=>toggleFav(r.id)}
                      aria-label="즐겨찾기"
                      title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}>★</button>
                  </td>
                  <td className="muted mono">{r.id}</td>
                  <td className="cell-name">
                    <button className="report-name-btn" onClick={()=>setPreviewTarget(r)}>
                      {r.name}
                    </button>
                  </td>
                  <td>
                    <span className="chip" style={{background: chip.bg, color: chip.color}}>{chip.label}</span>
                  </td>
                  <td className="mono" style={{fontSize: 12, color:"var(--text-2)"}}>{r.period}</td>
                  <td>{r.author}</td>
                  <td className="muted mono" style={{fontSize: 12}}>{r.created}</td>
                  <td>
                    <div className="report-activity">
                      <span title="조회수" className="activity-pill">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                        {r.views}
                      </span>
                      {r.links > 0 && (
                        <span title="활성 공유 링크" className="activity-pill" style={{background:"#F0EBFF", color:"#6B3FCB"}}>
                          🔗{r.links}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{display:"flex", gap:6, justifyContent:"flex-end"}}>
                      <button className="btn sm" onClick={()=>setPreviewTarget(r)}>미리보기</button>
                      <button className="btn sm" onClick={()=>setShareTarget(r)}>
                        <Icon.upload style={{width:12,height:12}}/>공유
                      </button>
                      <button className="btn sm">
                        <Icon.download style={{width:12,height:12}}/>PDF
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={9}>
                <div className="empty-state" style={{padding: 48}}>
                  <Icon.doc style={{width:36, height:36, color:"var(--text-4)"}}/>
                  <div className="empty-title">조건에 맞는 보고서가 없어요</div>
                  <div className="empty-sub">필터를 바꾸거나 새 보고서를 생성해보세요.</div>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card warn-card" style={{marginTop: 0}}>
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">보고서는 생성 시점의 데이터로 고정돼요</div>
          <div className="warn-text">
            제때 단가나 판매량이 이후 수정되어도 기존 보고서는 그대로 보관돼요. 다시 만들고 싶으면 <b>새 보고서 생성</b>을 눌러주세요. (CLAUDE.md 정책)
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {shareTarget   && <Pages.ShareLinkModal report={shareTarget} onClose={()=>setShareTarget(null)}/>}
      {scheduleOpen  && <Pages.ScheduleManagerModal onClose={()=>setScheduleOpen(false)}/>}
      {previewTarget && (
        <Pages.ReportPreviewModal
          report={previewTarget}
          onClose={()=>setPreviewTarget(null)}
          onShare={(r)=>{ setPreviewTarget(null); setShareTarget(r); }}
        />
      )}
    </main>
  );
}

/* ============================================================
   공통 — 보고서 빌더 레이아웃
   왼쪽: 옵션, 오른쪽: 미리보기
============================================================ */
function ReportBuilderShell({ breadcrumb, title, sub, kind, options, preview, exportNote }) {
  return (
    <main className="main">
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        sub={sub}
        actions={<>
          <button className="btn"><Icon.doc style={{width:14, height:14}}/>임시 저장</button>
          <button className="btn primary">
            <Icon.download style={{width:14, height:14}}/>보고서 생성
          </button>
        </>}
      />

      <div className="report-builder">
        {/* 옵션 */}
        <aside className="report-options card">
          <div className="section-h">보고서 옵션</div>
          {options}
        </aside>

        {/* 미리보기 */}
        <div className="report-preview-wrap">
          <div className="report-preview-head">
            <div>
              <div className="card-title">미리보기</div>
              <div className="card-sub">실제 보고서 1쪽 시안 — 옵션 변경 시 자동 갱신</div>
            </div>
            <div className="report-paper-meta">
              <span className="mono muted" style={{fontSize:12}}>RPT-DRAFT</span>
              <span className="chip" style={{background: KIND_CHIP[kind].bg, color: KIND_CHIP[kind].color}}>{KIND_CHIP[kind].label}</span>
            </div>
          </div>
          <div className="report-paper">
            {preview}
          </div>
          {exportNote && (
            <div className="report-export-note">
              <Icon.alert style={{width:14, height:14, color:"var(--accent)"}}/>
              <span>{exportNote}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* 옵션 — 라벨/체크/세그먼트 헬퍼 */
function OptGroup({ label, children, hint }) {
  return (
    <div className="opt-group">
      <div className="opt-label">{label}</div>
      {hint && <div className="opt-hint">{hint}</div>}
      <div className="opt-body">{children}</div>
    </div>
  );
}
function Seg({ value, onChange, options }) {
  return (
    <div className="seg-row">
      {options.map(o => (
        <button key={o.value || o}
          className={"seg-pill " + (value === (o.value || o) ? "active" : "")}
          onClick={() => onChange(o.value || o)}>
          {o.label || o}
        </button>
      ))}
    </div>
  );
}
function Check({ label, value, onChange, hint }) {
  return (
    <label className="opt-check">
      <input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)} />
      <span className="opt-check-box"><Icon.check style={{width:12, height:12}}/></span>
      <div>
        <div className="opt-check-label">{label}</div>
        {hint && <div className="opt-check-hint">{hint}</div>}
      </div>
    </label>
  );
}

/* ============================================================
   Page: 판매량 보고서
============================================================ */
function ReportSalesPage() {
  const [periodMode, setPeriodMode] = useRpt("month");
  const [year, setYear]   = useRpt(2026);
  const [month, setMonth] = useRpt(4);
  const [scope, setScope] = useRpt("all");
  const [topN, setTopN]   = useRpt(20);
  const [opts, setOpts] = useRpt({
    catShare:  true,
    rankTable: true,
    prevComp:  true,
    variant:   true,
    costRate:  false,
    summary:   true,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const periodLabel = periodMode === "year" ? `${year}년` : `${year}년 ${month}월`;

  // 데모 데이터 (페이지 내 자체 정의 — 다른 파일 데이터를 가져오지 않음)
  const topMenus = [
    { name: "슈퍼콤비네이션", qty: 32450, share: 18.2, prevDelta: 6.4,  costRate: 29.4 },
    { name: "포테이토피자",    qty: 19100, share: 10.7, prevDelta: 5.5,  costRate: 38.2 },
    { name: "불고기피자",      qty: 17060, share:  9.6, prevDelta: -3.1, costRate: 28.2 },
    { name: "고르곤졸라",      qty: 13960, share:  7.8, prevDelta: 11.8, costRate: 36.8 },
    { name: "새우파티",        qty: 13240, share:  7.4, prevDelta: -3.9, costRate: 35.5 },
  ];
  const catShares = [
    { cat: "피자",      pct: 56.2, color: "#3182F6" },
    { cat: "엣지&도우", pct: 11.4, color: "#8B5CF6" },
    { cat: "사이드",    pct:  8.9, color: "#F59E0B" },
    { cat: "음료",      pct:  7.5, color: "#F97316" },
    { cat: "추가토핑",  pct:  6.8, color: "#06B6D4" },
    { cat: "기타",      pct:  9.2, color: "#6B7280" },
  ];

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "판매량 보고서"]}
      title="판매량 보고서 생성"
      sub="기간·범위·표시 항목을 선택하면 미리보기가 즉시 갱신돼요."
      kind="sales"
      exportNote="PDF / Excel 두 형식으로 동시 저장돼요. 보고서센터 목록에서 다시 받을 수 있어요."
      options={<>
        <OptGroup label="집계 기간">
          <Seg value={periodMode} onChange={setPeriodMode}
            options={[{value:"month",label:"월 단위"},{value:"year",label:"년 단위"}]}/>
          <div className="opt-period-row">
            <select className="period-select num" value={year} onChange={e=>setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            {periodMode === "month" && (
              <select className="period-select num" value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
                {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            )}
          </div>
        </OptGroup>

        <OptGroup label="대상 범위">
          <Seg value={scope} onChange={setScope}
            options={[{value:"all",label:"전체"},{value:"pizza",label:"피자만"},{value:"side",label:"사이드만"}]}/>
        </OptGroup>

        <OptGroup label="순위 깊이">
          <Seg value={topN} onChange={setTopN}
            options={[{value:10,label:"TOP 10"},{value:20,label:"TOP 20"},{value:50,label:"전체"}]}/>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="요약 (총 판매량·평균 원가율)"   value={opts.summary}   onChange={v=>upd("summary",v)}/>
          <Check label="카테고리별 판매 비중 (도넛)"     value={opts.catShare}  onChange={v=>upd("catShare",v)}/>
          <Check label="메뉴 순위표"                     value={opts.rankTable} onChange={v=>upd("rankTable",v)}/>
          <Check label="규격별 (L/R/기타) 세부"           value={opts.variant}   onChange={v=>upd("variant",v)} hint="확장 행으로 표시"/>
          <Check label="전월 대비 증감"                  value={opts.prevComp}  onChange={v=>upd("prevComp",v)}/>
          <Check label="원가율 컬럼"                     value={opts.costRate}  onChange={v=>upd("costRate",v)} hint="35% 초과는 ⚠ 표시"/>
        </OptGroup>

        <OptGroup label="문서 형식">
          <Check label="PDF (보고용 — 상무님)"     value={true} onChange={()=>{}}/>
          <Check label="Excel (원본 데이터)"         value={true} onChange={()=>{}}/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
          <h2 className="paper-title">{periodLabel} 판매량 보고서</h2>
          <div className="paper-meta">
            <span>대상: {scope === "all" ? "전체 메뉴" : scope === "pizza" ? "피자" : "사이드"}</span>
            <span>·</span>
            <span>표시: TOP {topN === 50 ? "전체" : topN}</span>
            <span>·</span>
            <span className="mono">생성일 2026.05.22 · 민혁 책임</span>
          </div>
        </div>

        {opts.summary && (
          <div className="paper-stat-row">
            <div className="paper-stat">
              <div className="paper-stat-label">총 판매량</div>
              <div className="paper-stat-val num">178,240<span className="unit">개</span></div>
              <div className="paper-stat-foot positive">▲ 6.8% 전월 대비</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">평균 원가율</div>
              <div className="paper-stat-val num">31.4<span className="unit">%</span></div>
              <div className="paper-stat-foot">35% 초과 메뉴 6개</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">신규 메뉴</div>
              <div className="paper-stat-val num">3<span className="unit">개</span></div>
              <div className="paper-stat-foot">치즈볼·트러플페퍼로니·가정의달세트</div>
            </div>
          </div>
        )}

        {opts.catShare && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 판매 비중</div>
            <div className="share-stack" style={{marginTop:10}}>
              {catShares.map(c => (
                <div key={c.cat} className="share-seg"
                  style={{flex: c.pct, background: c.color}}
                  title={`${c.cat} ${c.pct}%`}></div>
              ))}
            </div>
            <div className="paper-legend">
              {catShares.map(c => (
                <div className="paper-legend-item" key={c.cat}>
                  <span className="dot" style={{background:c.color}}></span>
                  <span>{c.cat}</span>
                  <span className="num" style={{fontWeight:700}}>{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {opts.rankTable && (
          <div className="paper-section">
            <div className="paper-section-title">메뉴 판매량 순위 (TOP 5 미리보기)</div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width: 40}}>#</th>
                  <th>메뉴명</th>
                  <th style={{width: 100, textAlign:"right"}}>판매량</th>
                  <th style={{width: 90, textAlign:"right"}}>비중</th>
                  {opts.prevComp && <th style={{width: 90, textAlign:"right"}}>전월 대비</th>}
                  {opts.costRate && <th style={{width: 70, textAlign:"right"}}>원가율</th>}
                </tr>
              </thead>
              <tbody>
                {topMenus.map((m, i) => (
                  <tr key={m.name}>
                    <td className="num">{i+1}</td>
                    <td>{m.name}</td>
                    <td className="num right">{fmtKRW(m.qty)}</td>
                    <td className="num right">{m.share}%</td>
                    {opts.prevComp && (
                      <td className="num right" style={{color: m.prevDelta>=0?"var(--positive)":"var(--negative)", fontWeight:700}}>
                        {m.prevDelta>=0?"▲":"▼"} {Math.abs(m.prevDelta).toFixed(1)}%
                      </td>
                    )}
                    {opts.costRate && (
                      <td className="num right">{m.costRate.toFixed(1)}%{m.costRate >= 35 ? " ⚠" : ""}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="paper-pagebreak">— 이하 TOP {topN} 까지 본 보고서에 포함 —</div>
          </div>
        )}

        <div className="paper-foot">
          <span>1 / 8</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}

/* ============================================================
   Page: 제때 가격 보고서
============================================================ */
function ReportPricePage() {
  const [periodMode, setPeriodMode] = useRpt("week");
  const [threshold, setThreshold]   = useRpt(3);
  const [opts, setOpts] = useRpt({
    changedOnly: true,
    history7:    true,
    costImpact:  true,
    catSummary:  true,
    unlinked:    false,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const changes = [
    { code: "C001", name: "모짜렐라치즈 2kg",    prev: 7400,  curr: 7680,  cat: "치즈", impactMenus: 23 },
    { code: "C003", name: "고르곤졸라치즈 500g", prev: 13400, curr: 14300, cat: "치즈", impactMenus: 4  },
    { code: "T002", name: "새우(냉동) 1kg",      prev: 18600, curr: 19800, cat: "토핑", impactMenus: 6  },
    { code: "T005", name: "베이컨 1kg",          prev: 12800, curr: 13500, cat: "토핑", impactMenus: 5  },
    { code: "V001", name: "양파 10kg",           prev: 2100,  curr: 1990,  cat: "야채", impactMenus: 31 },
  ];

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "제때 가격 보고서"]}
      title="제때 가격 보고서 생성"
      sub="제때 단가 변동 — 임계값을 넘는 품목만 자동 추출돼요."
      kind="price"
      exportNote="주간 보고서는 매주 월요일 09:00 자동 생성됩니다. (예약 설정에서 변경)"
      options={<>
        <OptGroup label="대상 기간">
          <Seg value={periodMode} onChange={setPeriodMode}
            options={[
              {value:"week",  label:"이번 주"},
              {value:"month", label:"이번 달"},
              {value:"custom",label:"사용자 지정"},
            ]}/>
          {periodMode === "custom" && (
            <div className="opt-period-row" style={{marginTop:8}}>
              <input type="date" className="input" defaultValue="2026-05-14"/>
              <span style={{color:"var(--text-3)"}}>~</span>
              <input type="date" className="input" defaultValue="2026-05-21"/>
            </div>
          )}
        </OptGroup>

        <OptGroup label="변동률 임계값" hint="이 비율 이상 변동된 품목만 포함">
          <div className="threshold-bar">
            <input type="range" min="0" max="10" step="0.5"
              value={threshold} onChange={e=>setThreshold(parseFloat(e.target.value))}/>
            <div className="threshold-val num" style={{minWidth:64}}>±{threshold}<span className="unit">%</span></div>
          </div>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="변동 품목만 (변동 없음 제외)"      value={opts.changedOnly} onChange={v=>upd("changedOnly",v)}/>
          <Check label="카테고리별 변동 요약"               value={opts.catSummary}  onChange={v=>upd("catSummary",v)}/>
          <Check label="최근 7회 단가 추이 (스파크라인)"    value={opts.history7}    onChange={v=>upd("history7",v)}/>
          <Check label="원가 영향 — 영향 받는 메뉴 수"      value={opts.costImpact}  onChange={v=>upd("costImpact",v)}/>
          <Check label="미연동 품목 부록"                  value={opts.unlinked}    onChange={v=>upd("unlinked",v)} hint="단가표에 등록 안 된 재료"/>
        </OptGroup>

        <OptGroup label="배포 채널">
          <Check label="PDF 첨부 — 카톡 (상무님 그룹)"  value={true}  onChange={()=>{}}/>
          <Check label="이메일 자동 발송"               value={false} onChange={()=>{}}/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · 제때 단가 관리</div>
          <h2 className="paper-title">제때 가격 변동 보고서 (2026.05.14 ~ 05.21)</h2>
          <div className="paper-meta">
            <span>임계값: ±{threshold}%</span>
            <span>·</span>
            <span>변동 품목 {changes.length}건</span>
            <span>·</span>
            <span className="mono">생성일 2026.05.22 · 민혁 책임</span>
          </div>
        </div>

        <div className="paper-stat-row">
          <div className="paper-stat">
            <div className="paper-stat-label">인상</div>
            <div className="paper-stat-val num" style={{color:"var(--negative)"}}>4<span className="unit">건</span></div>
            <div className="paper-stat-foot">평균 +5.8%</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">인하</div>
            <div className="paper-stat-val num" style={{color:"var(--positive)"}}>1<span className="unit">건</span></div>
            <div className="paper-stat-foot">평균 −5.2%</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">영향 메뉴 (합)</div>
            <div className="paper-stat-val num">69<span className="unit">개</span></div>
            <div className="paper-stat-foot">중복 제외 · 원가표 자동 재계산 완료</div>
          </div>
        </div>

        {opts.catSummary && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 변동 요약</div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th>카테고리</th>
                  <th style={{width: 80, textAlign:"right"}}>품목 수</th>
                  <th style={{width: 80, textAlign:"right"}}>인상</th>
                  <th style={{width: 80, textAlign:"right"}}>인하</th>
                  <th style={{width: 100, textAlign:"right"}}>평균 변동</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>치즈</td><td className="num right">2</td><td className="num right" style={{color:"var(--negative)"}}>2</td><td className="num right">0</td><td className="num right" style={{color:"var(--negative)"}}>+5.6%</td></tr>
                <tr><td>토핑</td><td className="num right">2</td><td className="num right" style={{color:"var(--negative)"}}>2</td><td className="num right">0</td><td className="num right" style={{color:"var(--negative)"}}>+5.9%</td></tr>
                <tr><td>야채</td><td className="num right">1</td><td className="num right">0</td><td className="num right" style={{color:"var(--positive)"}}>1</td><td className="num right" style={{color:"var(--positive)"}}>−5.2%</td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="paper-section">
          <div className="paper-section-title">변동 품목 상세</div>
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{width:70}}>코드</th>
                <th>제품명</th>
                <th style={{width:90, textAlign:"right"}}>이전</th>
                <th style={{width:90, textAlign:"right"}}>현재</th>
                <th style={{width:90, textAlign:"right"}}>변동률</th>
                {opts.history7 && <th style={{width:80}}>추이</th>}
                {opts.costImpact && <th style={{width:80, textAlign:"right"}}>영향 메뉴</th>}
              </tr>
            </thead>
            <tbody>
              {changes.map(c => {
                const pct = ((c.curr - c.prev) / c.prev) * 100;
                return (
                  <tr key={c.code}>
                    <td className="muted mono">{c.code}</td>
                    <td>{c.name}</td>
                    <td className="num right muted">{fmtKRW(c.prev)}</td>
                    <td className="num right" style={{fontWeight:800}}>{fmtKRW(c.curr)}</td>
                    <td className="num right" style={{color: pct>0?"var(--negative)":"var(--positive)", fontWeight:700}}>
                      {pct>0?"▲":"▼"} {Math.abs(pct).toFixed(1)}%
                    </td>
                    {opts.history7 && (
                      <td>
                        <svg width="64" height="20" viewBox="0 0 64 20">
                          <path d={pct>0
                            ? "M2 14 L14 13 L26 12 L38 10 L50 9 L62 6"
                            : "M2 8 L14 9 L26 9 L38 10 L50 11 L62 13"}
                            fill="none" stroke={pct>0?"var(--negative)":"var(--positive)"} strokeWidth="1.5"/>
                        </svg>
                      </td>
                    )}
                    {opts.costImpact && (
                      <td className="num right">{c.impactMenus}개</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="paper-foot">
          <span>1 / 6</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}

/* ============================================================
   Page: 제때 출고량 보고서
============================================================ */
function ReportShipmentPage() {
  const [periodMode, setPeriodMode] = useRpt("month");
  const [type, setType] = useRpt("all");
  const [opts, setOpts] = useRpt({
    chart:      true,
    catSummary: true,
    topList:    true,
    delta:      true,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const topShipped = [
    { name: "피자스티커 (200개)", cat: "포장", total: 10940, delta: 11.2 },
    { name: "피자박스 L (100개)", cat: "포장", total:  5700, delta:  8.4 },
    { name: "도우 L (50개입)",    cat: "도우", total:  4980, delta:  6.8 },
    { name: "양파 10kg",          cat: "야채", total:  3640, delta:  4.2 },
    { name: "콜라 1.25L (12병)",  cat: "음료", total:  2240, delta:  5.1 },
  ];

  const months = ["11월","12월","1월","2월","3월","4월","5월"];
  const series = [
    { name: "관리품목", data: [28400, 29100, 30200, 31050, 31800, 33240, 34850] },
    { name: "범용상품", data: [ 8200,  8460,  8720,  8910,  9180,  9420,  9680] },
  ];

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "제때 출고량 보고서"]}
      title="제때 출고량 보고서 생성"
      sub="대상 제품 출고량 — 카테고리·분류별로 요약돼요."
      kind="shipment"
      exportNote="대상 제품 목록은 제때상품관리 → 설정 페이지에서 변경할 수 있어요."
      options={<>
        <OptGroup label="집계 기간">
          <Seg value={periodMode} onChange={setPeriodMode}
            options={[
              {value:"week",  label:"주 단위"},
              {value:"month", label:"월 단위"},
              {value:"quart", label:"분기 단위"},
            ]}/>
          <div className="opt-period-row">
            <select className="period-select num" defaultValue={2026}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select className="period-select num" defaultValue={5}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </OptGroup>

        <OptGroup label="대상 분류">
          <Seg value={type} onChange={setType}
            options={[
              {value:"all",     label:"전체"},
              {value:"managed", label:"관리품목"},
              {value:"common",  label:"범용상품"},
            ]}/>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="월별 출고량 추이 차트"   value={opts.chart}      onChange={v=>upd("chart",v)}/>
          <Check label="카테고리별 합계"          value={opts.catSummary} onChange={v=>upd("catSummary",v)}/>
          <Check label="상위 출고 제품 TOP 10"    value={opts.topList}    onChange={v=>upd("topList",v)}/>
          <Check label="전월 대비 증감"            value={opts.delta}      onChange={v=>upd("delta",v)}/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · 제때상품관리</div>
          <h2 className="paper-title">2026년 4월 제때 출고량 보고서</h2>
          <div className="paper-meta">
            <span>대상: {type === "all" ? "전체" : type === "managed" ? "관리품목" : "범용상품"}</span>
            <span>·</span>
            <span>23개 제품</span>
            <span>·</span>
            <span className="mono">생성일 2026.05.22 · 민혁 책임</span>
          </div>
        </div>

        <div className="paper-stat-row">
          <div className="paper-stat">
            <div className="paper-stat-label">총 출고량</div>
            <div className="paper-stat-val num">44,530<span className="unit">건</span></div>
            <div className="paper-stat-foot positive">▲ 6.2% 전월 대비</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">관리품목</div>
            <div className="paper-stat-val num">34,850<span className="unit">건</span></div>
            <div className="paper-stat-foot">전체의 78.3%</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">범용상품</div>
            <div className="paper-stat-val num">9,680<span className="unit">건</span></div>
            <div className="paper-stat-foot">전체의 21.7%</div>
          </div>
        </div>

        {opts.chart && (
          <div className="paper-section">
            <div className="paper-section-title">월별 출고량 추이 (최근 7개월)</div>
            <div style={{padding: "8px 0"}}>
              <AreaChart
                series={series}
                labels={months}
                colors={["#1D766F", "#7C3AED"]}
                height={200}
                formatY={fmtShort}
              />
            </div>
            <div className="paper-legend">
              <div className="paper-legend-item"><span className="dot" style={{background:"#1D766F"}}></span><span>관리품목</span></div>
              <div className="paper-legend-item"><span className="dot" style={{background:"#7C3AED"}}></span><span>범용상품</span></div>
            </div>
          </div>
        )}

        {opts.topList && (
          <div className="paper-section">
            <div className="paper-section-title">상위 출고 제품 (TOP 5 미리보기)</div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width: 40}}>#</th>
                  <th>제품명</th>
                  <th style={{width: 80}}>카테고리</th>
                  <th style={{width: 110, textAlign:"right"}}>출고량</th>
                  {opts.delta && <th style={{width: 90, textAlign:"right"}}>전월 대비</th>}
                </tr>
              </thead>
              <tbody>
                {topShipped.map((p, i) => (
                  <tr key={p.name}>
                    <td className="num">{i+1}</td>
                    <td>{p.name}</td>
                    <td className="muted">{p.cat}</td>
                    <td className="num right">{fmtKRW(p.total)}건</td>
                    {opts.delta && (
                      <td className="num right" style={{color:"var(--positive)", fontWeight:700}}>▲ {p.delta.toFixed(1)}%</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="paper-foot">
          <span>1 / 5</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}

/* ============================================================
   Page: 판매량 비교 보고서
============================================================ */
function ReportMenuSalesComparePage() {
  const [mode, setMode] = useRpt("mom"); // mom | yoy | custom
  const [scope, setScope] = useRpt("all");
  const [opts, setOpts] = useRpt({
    summary:    true,
    catCompare: true,
    rankShift:  true,
    chart:      true,
    winners:    true,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const compareRows = [
    { name: "슈퍼콤비네이션", a: 30500, b: 32450, delta:  6.4, rankA: 1, rankB: 1 },
    { name: "포테이토피자",   a: 18100, b: 19100, delta:  5.5, rankA: 2, rankB: 2 },
    { name: "불고기피자",      a: 17600, b: 17060, delta: -3.1, rankA: 3, rankB: 3 },
    { name: "고르곤졸라",      a: 12480, b: 13960, delta: 11.8, rankA: 6, rankB: 4 },
    { name: "새우파티",        a: 13780, b: 13240, delta: -3.9, rankA: 4, rankB: 5 },
    { name: "하와이안",        a: 10470, b: 11090, delta:  5.9, rankA: 7, rankB: 6 },
    { name: "쉬림프골드",      a:  8910, b:  9550, delta:  7.2, rankA: 8, rankB: 7 },
  ];

  const months = ["기간 A","기간 B"];
  const series = [
    { name: "피자",     data: [102400, 111200] },
    { name: "사이드",   data: [ 14800,  16240] },
    { name: "엣지&도우",data: [ 19120,  20640] },
  ];

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "판매량 비교 보고서"]}
      title="판매량 비교 보고서 생성"
      sub="두 기간을 나란히 — 메뉴별 순위 이동·증감을 한눈에."
      kind="compare"
      exportNote="비교 모드를 바꾸면 A·B 기간 라벨이 자동으로 갱신돼요."
      options={<>
        <OptGroup label="비교 모드">
          <Seg value={mode} onChange={setMode}
            options={[
              {value:"mom",    label:"전월 대비"},
              {value:"yoy",    label:"전년 동월"},
              {value:"custom", label:"사용자 지정"},
            ]}/>
        </OptGroup>

        <OptGroup label="기간 A (기준)">
          <div className="opt-period-row">
            <select className="period-select num" defaultValue={2026}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select className="period-select num" defaultValue={3}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </OptGroup>

        <OptGroup label="기간 B (비교)">
          <div className="opt-period-row">
            <select className="period-select num" defaultValue={2026}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select className="period-select num" defaultValue={4}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </OptGroup>

        <OptGroup label="대상 범위">
          <Seg value={scope} onChange={setScope}
            options={[{value:"all",label:"전체"},{value:"pizza",label:"피자"},{value:"side",label:"사이드"}]}/>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="요약 (총 판매량·증감)"            value={opts.summary}    onChange={v=>upd("summary",v)}/>
          <Check label="카테고리별 비교"                   value={opts.catCompare} onChange={v=>upd("catCompare",v)}/>
          <Check label="순위 이동표 (메뉴별 A→B)"          value={opts.rankShift}  onChange={v=>upd("rankShift",v)}/>
          <Check label="비교 차트 (스택 막대)"             value={opts.chart}      onChange={v=>upd("chart",v)}/>
          <Check label="Winners &amp; Losers 부록"          value={opts.winners}    onChange={v=>upd("winners",v)} hint="±10% 이상 변동"/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
          <h2 className="paper-title">판매량 비교 보고서 — 2026.03 vs 2026.04</h2>
          <div className="paper-meta">
            <span>비교 모드: {mode === "mom" ? "전월 대비" : mode === "yoy" ? "전년 동월" : "사용자 지정"}</span>
            <span>·</span>
            <span>대상: {scope === "all" ? "전체" : scope === "pizza" ? "피자" : "사이드"}</span>
            <span>·</span>
            <span className="mono">생성일 2026.05.22 · 민혁 책임</span>
          </div>
        </div>

        {opts.summary && (
          <div className="paper-stat-row">
            <div className="paper-stat">
              <div className="paper-stat-label">총 판매량 (A)</div>
              <div className="paper-stat-val num">166,840<span className="unit">개</span></div>
              <div className="paper-stat-foot">2026.03</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">총 판매량 (B)</div>
              <div className="paper-stat-val num">178,240<span className="unit">개</span></div>
              <div className="paper-stat-foot">2026.04</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">증감</div>
              <div className="paper-stat-val num" style={{color:"var(--positive)"}}>▲ 6.8<span className="unit">%</span></div>
              <div className="paper-stat-foot">+11,400개</div>
            </div>
          </div>
        )}

        {opts.chart && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 판매량 비교</div>
            <div style={{padding: "8px 0"}}>
              <AreaChart
                series={series}
                labels={months}
                colors={["#7C3AED","#3182F6","#F59E0B"]}
                height={180}
                formatY={fmtShort}
              />
            </div>
            <div className="paper-legend">
              <div className="paper-legend-item"><span className="dot" style={{background:"#7C3AED"}}></span><span>피자</span></div>
              <div className="paper-legend-item"><span className="dot" style={{background:"#3182F6"}}></span><span>사이드</span></div>
              <div className="paper-legend-item"><span className="dot" style={{background:"#F59E0B"}}></span><span>엣지&amp;도우</span></div>
            </div>
          </div>
        )}

        {opts.rankShift && (
          <div className="paper-section">
            <div className="paper-section-title">순위 이동 (TOP 7 미리보기)</div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th>메뉴명</th>
                  <th style={{width: 100, textAlign:"right"}}>A (3월)</th>
                  <th style={{width: 100, textAlign:"right"}}>B (4월)</th>
                  <th style={{width: 80, textAlign:"right"}}>증감</th>
                  <th style={{width: 100, textAlign:"center"}}>순위 이동</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(r => {
                  const shift = r.rankA - r.rankB; // + means moved up
                  return (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td className="num right muted">{fmtKRW(r.a)}</td>
                      <td className="num right" style={{fontWeight:700}}>{fmtKRW(r.b)}</td>
                      <td className="num right" style={{color: r.delta>=0?"var(--positive)":"var(--negative)", fontWeight:700}}>
                        {r.delta>=0?"▲":"▼"} {Math.abs(r.delta).toFixed(1)}%
                      </td>
                      <td className="center">
                        <span className="mono" style={{fontSize:12, color:"var(--text-3)"}}>{r.rankA}위 → {r.rankB}위</span>
                        {shift !== 0 && (
                          <span style={{
                            marginLeft: 6, fontWeight:800, fontSize:12,
                            color: shift>0 ? "var(--positive)" : "var(--negative)"
                          }}>
                            {shift>0 ? "▲"+shift : "▼"+Math.abs(shift)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {opts.winners && (
          <div className="paper-section">
            <div className="paper-section-title">Winners &amp; Losers (±10% 이상)</div>
            <div className="winners-grid">
              <div className="winner-col">
                <div className="winner-h" style={{color:"var(--positive)"}}>▲ Winners</div>
                <div className="winner-row"><span>고르곤졸라</span><b className="num" style={{color:"var(--positive)"}}>+11.8%</b></div>
                <div className="winner-row"><span>치즈볼 (신규)</span><b className="num" style={{color:"var(--positive)"}}>NEW</b></div>
                <div className="winner-row"><span>트러플 페퍼로니</span><b className="num" style={{color:"var(--positive)"}}>+24.3%</b></div>
              </div>
              <div className="winner-col">
                <div className="winner-h" style={{color:"var(--negative)"}}>▼ Losers</div>
                <div className="winner-row"><span>치즈크러스트</span><b className="num" style={{color:"var(--negative)"}}>−14.2%</b></div>
                <div className="winner-row"><span>골드스윗</span><b className="num" style={{color:"var(--negative)"}}>−16.0%</b></div>
                <div className="winner-row"><span>할라피뇨 (단독)</span><b className="num" style={{color:"var(--negative)"}}>폐기 검토</b></div>
              </div>
            </div>
          </div>
        )}

        <div className="paper-foot">
          <span>1 / 7</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}

/* ============================================================
   Page: 원가계산 보고서 — 5개 카테고리 종합원가를 한 장에
============================================================ */

// 데모 — 카테고리별 종합원가 데이터 (페이지 내 자체 정의)
const COST_BY_CATEGORY = {
  pizza: {
    label: "피자",
    color: "#3182F6",
    note: "L 규격 기준 · 엣지 4종 평균 반영",
    menus: [
      { name: "슈퍼콤비네이션 L", cost: 8200, sale: 32900, rate: 24.9 },
      { name: "포테이토피자 L",   cost: 11420, sale: 29900, rate: 38.2 },
      { name: "불고기피자 L",     cost: 8720,  sale: 30900, rate: 28.2 },
      { name: "고르곤졸라 L",     cost: 12480, sale: 33900, rate: 36.8 },
      { name: "새우파티 L",       cost: 12400, sale: 34900, rate: 35.5 },
      { name: "하와이안 L",       cost: 8710,  sale: 28900, rate: 30.1 },
      { name: "쉬림프골드 L",     cost: 11700, sale: 36900, rate: 31.7 },
      { name: "치즈피자 L",       cost: 6680,  sale: 25900, rate: 25.8 },
      { name: "트러플 페퍼로니 L", cost: 11320, sale: 33900, rate: 33.4 },
    ],
  },
  personal: {
    label: "1인피자",
    color: "#10B981",
    note: "단일 규격 · 점심 회전율 메뉴",
    menus: [
      { name: "콤비 1인",      cost: 4260, sale: 14900, rate: 28.6 },
      { name: "포테이토 1인",  cost: 4500, sale: 14900, rate: 30.2 },
      { name: "불고기 1인",    cost: 4090, sale: 14900, rate: 27.4 },
      { name: "치즈 1인",      cost: 3640, sale: 13900, rate: 26.2 },
    ],
  },
  side: {
    label: "사이드",
    color: "#F59E0B",
    note: "소스 · 추가 토핑 제외",
    menus: [
      { name: "오븐스파게티",  cost: 2430, sale: 7900, rate: 30.8 },
      { name: "치즈스틱",      cost: 1660, sale: 6900, rate: 24.1 },
      { name: "치즈볼",        cost: 2360, sale: 8900, rate: 26.5 },
      { name: "치킨윙",        cost: 3680, sale: 9900, rate: 37.2 },
      { name: "감자튀김",      cost: 1080, sale: 4900, rate: 22.0 },
    ],
  },
  set: {
    label: "세트박스",
    color: "#EC4899",
    note: "구성품 원가 합산 — 박스·콜라 포함",
    menus: [
      { name: "패밀리박스 L",   cost: 12570, sale: 42900, rate: 29.3 },
      { name: "더블박스 L",     cost: 12260, sale: 38900, rate: 31.5 },
      { name: "커플박스 R",     cost: 8910,  sale: 26900, rate: 33.1 },
    ],
  },
  edge: {
    label: "엣지 & 도우",
    color: "#8B5CF6",
    note: "기본 도우 대비 추가 원가",
    menus: [
      { name: "치즈크러스트 L",     cost: 3470, sale: 8500, rate: 40.8 },
      { name: "치즈크러스트 R",     cost: 1910, sale: 4500, rate: 42.4 },
      { name: "골드스윗크러스트 L", cost: 3700, sale: 8500, rate: 43.5 },
      { name: "씬도우 L",           cost: 1820, sale: 8000, rate: 22.8 },
    ],
  },
};

function ReportCostPage() {
  const [periodMode, setPeriodMode] = useRpt("month");
  const [year, setYear]   = useRpt(2026);
  const [month, setMonth] = useRpt(4);
  const [riskThreshold, setRiskThreshold] = useRpt(35);
  const [cats, setCats] = useRpt({
    pizza: true, personal: true, side: true, set: true, edge: true,
  });
  const [opts, setOpts] = useRpt({
    summary: true, catTable: true, perCategory: true, riskList: true, salePrice: true,
  });
  const updCat = (k, v) => setCats(s => ({ ...s, [k]: v }));
  const updOpt = (k, v) => setOpts(s => ({ ...s, [k]: v }));

  const periodLabel = periodMode === "year" ? `${year}년` : `${year}년 ${month}월`;

  // 활성 카테고리만 추림
  const activeCats = Object.entries(COST_BY_CATEGORY).filter(([k]) => cats[k]);

  // 카테고리별 통계 계산
  const catStats = activeCats.map(([k, c]) => {
    const rates = c.menus.map(m => m.rate);
    const avg = rates.reduce((s,v)=>s+v,0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const risk = c.menus.filter(m => m.rate >= riskThreshold).length;
    return { id: k, ...c, avg, min, max, risk, count: c.menus.length };
  });

  // 전체 통계
  const allMenus = activeCats.flatMap(([_, c]) => c.menus);
  const totalCount = allMenus.length;
  const allAvg = totalCount ? allMenus.reduce((s,m)=>s+m.rate,0) / totalCount : 0;
  const allRisk = allMenus.filter(m => m.rate >= riskThreshold).length;
  const allMaxRate = totalCount ? Math.max(...allMenus.map(m=>m.rate)) : 0;

  // 위험 메뉴 (정렬)
  const riskMenus = activeCats.flatMap(([_, c]) =>
    c.menus.filter(m => m.rate >= riskThreshold).map(m => ({ ...m, catLabel: c.label, catColor: c.color }))
  ).sort((a, b) => b.rate - a.rate);

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "원가계산 보고서"]}
      title="원가계산 보고서 생성"
      sub="5개 카테고리(피자·1인피자·사이드·세트박스·엣지&도우)의 종합 원가를 한 장에 모아요."
      kind="cost"
      exportNote="제때 단가는 보고서 생성 시점으로 고정돼요. 이후 단가 변동은 다음 보고서에 반영됩니다."
      options={<>
        <OptGroup label="집계 기준 기간">
          <Seg value={periodMode} onChange={setPeriodMode}
            options={[{value:"month",label:"월 단위"},{value:"year",label:"년 단위"}]}/>
          <div className="opt-period-row">
            <select className="period-select num" value={year} onChange={e=>setYear(parseInt(e.target.value))}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            {periodMode === "month" && (
              <select className="period-select num" value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
                {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            )}
          </div>
        </OptGroup>

        <OptGroup label="포함 카테고리" hint="체크된 카테고리만 종합 원가표에 포함돼요">
          <Check label="피자 종합 원가"     value={cats.pizza}    onChange={v=>updCat("pizza",v)}/>
          <Check label="1인피자 종합 원가"  value={cats.personal} onChange={v=>updCat("personal",v)}/>
          <Check label="사이드 종합 원가"   value={cats.side}     onChange={v=>updCat("side",v)}/>
          <Check label="세트박스 종합 원가" value={cats.set}      onChange={v=>updCat("set",v)}/>
          <Check label="엣지 & 도우 원가"   value={cats.edge}     onChange={v=>updCat("edge",v)}/>
        </OptGroup>

        <OptGroup label="위험 메뉴 기준" hint="이 원가율을 초과하는 메뉴는 ⚠ 표시">
          <div className="threshold-bar">
            <input type="range" min="25" max="50" step="1"
              value={riskThreshold} onChange={e=>setRiskThreshold(parseInt(e.target.value))}/>
            <div className="threshold-val num" style={{minWidth:64, color:"var(--warn)"}}>{riskThreshold}<span className="unit">%↑</span></div>
          </div>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="요약 (평균 원가율·위험 메뉴 수)"   value={opts.summary}     onChange={v=>updOpt("summary",v)}/>
          <Check label="카테고리별 종합 비교표"            value={opts.catTable}    onChange={v=>updOpt("catTable",v)}/>
          <Check label="카테고리별 메뉴 상세 (5개씩)"      value={opts.perCategory} onChange={v=>updOpt("perCategory",v)}/>
          <Check label="판매가 컬럼 표시"                 value={opts.salePrice}   onChange={v=>updOpt("salePrice",v)}/>
          <Check label="위험 메뉴 부록 (원가율 높은 순)"   value={opts.riskList}    onChange={v=>updOpt("riskList",v)}/>
        </OptGroup>

        <OptGroup label="문서 형식">
          <Check label="PDF (보고용 — 상무님)"  value={true} onChange={()=>{}}/>
          <Check label="Excel (원본 데이터)"     value={true} onChange={()=>{}}/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · 원가관리</div>
          <h2 className="paper-title">{periodLabel} 원가계산 종합 보고서</h2>
          <div className="paper-meta">
            <span>대상: {activeCats.length}개 카테고리 · {totalCount}개 메뉴</span>
            <span>·</span>
            <span>위험 기준 {riskThreshold}%↑</span>
            <span>·</span>
            <span className="mono">단가 기준 2026.05.21 · 민혁 책임</span>
          </div>
        </div>

        {opts.summary && (
          <div className="paper-stat-row" style={{gridTemplateColumns:"repeat(4, 1fr)"}}>
            <div className="paper-stat">
              <div className="paper-stat-label">대상 메뉴</div>
              <div className="paper-stat-val num">{totalCount}<span className="unit">개</span></div>
              <div className="paper-stat-foot">{activeCats.length}개 카테고리</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">평균 원가율</div>
              <div className="paper-stat-val num">{allAvg.toFixed(1)}<span className="unit">%</span></div>
              <div className="paper-stat-foot">전 카테고리 가중평균</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">위험 메뉴</div>
              <div className="paper-stat-val num" style={{color:"var(--warn)"}}>{allRisk}<span className="unit">개</span></div>
              <div className="paper-stat-foot">{riskThreshold}% 초과</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">최고 원가율</div>
              <div className="paper-stat-val num" style={{color:"var(--negative)"}}>{allMaxRate.toFixed(1)}<span className="unit">%</span></div>
              <div className="paper-stat-foot">단일 메뉴 기준</div>
            </div>
          </div>
        )}

        {opts.catTable && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 종합 비교</div>

            {/* 카테고리별 평균 원가율 가로 막대 */}
            <div className="cost-bars">
              {catStats.map(c => {
                const w = (c.avg / 50) * 100; // 50%를 만점 기준으로 가시화
                return (
                  <div key={c.id} className="cost-bar-row">
                    <div className="cost-bar-label">
                      <span className="dot" style={{background: c.color}}></span>
                      <span>{c.label}</span>
                    </div>
                    <div className="cost-bar-track">
                      <div className="cost-bar-fill" style={{width:`${Math.min(w,100)}%`, background: c.color}}></div>
                      {/* 위험 기준선 */}
                      <div className="cost-bar-threshold" style={{left:`${(riskThreshold/50)*100}%`}} title={`위험 기준 ${riskThreshold}%`}></div>
                    </div>
                    <div className="cost-bar-val num">
                      <b>{c.avg.toFixed(1)}<span className="unit">%</span></b>
                      <span className="muted" style={{fontSize:11, marginLeft:4}}>
                        ({c.min.toFixed(1)}~{c.max.toFixed(1)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <table className="paper-table" style={{marginTop:14}}>
              <thead>
                <tr>
                  <th>카테고리</th>
                  <th style={{width:70, textAlign:"right"}}>메뉴 수</th>
                  <th style={{width:90, textAlign:"right"}}>평균 원가율</th>
                  <th style={{width:120, textAlign:"right"}}>최저 ~ 최고</th>
                  <th style={{width:80, textAlign:"right"}}>위험</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                {catStats.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{display:"inline-flex", alignItems:"center", gap:6}}>
                        <span className="dot" style={{width:8, height:8, borderRadius:"50%", background: c.color}}></span>
                        <b>{c.label}</b>
                      </span>
                    </td>
                    <td className="num right">{c.count}</td>
                    <td className="num right" style={{fontWeight:800}}>{c.avg.toFixed(1)}%</td>
                    <td className="num right">{c.min.toFixed(1)}% ~ {c.max.toFixed(1)}%</td>
                    <td className="num right">
                      {c.risk > 0
                        ? <span style={{color:"var(--warn)", fontWeight:800}}>{c.risk}개 ⚠</span>
                        : <span className="muted">0개</span>}
                    </td>
                    <td className="muted" style={{fontSize:11}}>{c.note}</td>
                  </tr>
                ))}
                <tr style={{background:"var(--surface-2)"}}>
                  <td style={{fontWeight:800}}>합계</td>
                  <td className="num right" style={{fontWeight:800}}>{totalCount}</td>
                  <td className="num right" style={{fontWeight:800}}>{allAvg.toFixed(1)}%</td>
                  <td className="num right muted">—</td>
                  <td className="num right" style={{fontWeight:800, color:"var(--warn)"}}>{allRisk}개</td>
                  <td className="muted" style={{fontSize:11}}>전 카테고리 기준</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {opts.perCategory && catStats.map(c => (
          <div className="paper-section" key={c.id}>
            <div className="paper-section-title" style={{
              borderBottomColor: c.color,
              display:"flex", justifyContent:"space-between", alignItems:"flex-end",
            }}>
              <span style={{display:"inline-flex", alignItems:"center", gap:8}}>
                <span className="dot" style={{width:10, height:10, borderRadius:3, background: c.color}}></span>
                {c.label} 종합 원가 (상위 5개)
              </span>
              <span className="muted" style={{fontSize:11, fontWeight:600, textTransform:"none"}}>
                평균 <b className="num" style={{color:"var(--text-1)"}}>{c.avg.toFixed(1)}%</b> · 위험 {c.risk}개
              </span>
            </div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width: 36}}>#</th>
                  <th>메뉴명</th>
                  <th style={{width: 100, textAlign:"right"}}>원가</th>
                  {opts.salePrice && <th style={{width: 100, textAlign:"right"}}>판매가</th>}
                  <th style={{width: 90, textAlign:"right"}}>원가율</th>
                  <th style={{width: 36}}></th>
                </tr>
              </thead>
              <tbody>
                {c.menus.slice(0, 5).map((m, i) => {
                  const risk = m.rate >= riskThreshold;
                  return (
                    <tr key={m.name}>
                      <td className="num">{i+1}</td>
                      <td>{m.name}</td>
                      <td className="num right">{fmtKRW(m.cost)}원</td>
                      {opts.salePrice && <td className="num right muted">{fmtKRW(m.sale)}원</td>}
                      <td className="num right" style={{fontWeight: risk?800:600, color: risk?"var(--warn)":"var(--text-1)"}}>
                        {m.rate.toFixed(1)}%
                      </td>
                      <td>{risk && <span style={{color:"var(--warn)"}}>⚠</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {c.menus.length > 5 && (
              <div className="paper-pagebreak">— 이하 {c.menus.length - 5}개 메뉴 본 보고서에 포함 —</div>
            )}
          </div>
        ))}

        {opts.riskList && riskMenus.length > 0 && (
          <div className="paper-section">
            <div className="paper-section-title" style={{borderBottomColor:"var(--warn)"}}>
              <span style={{display:"inline-flex", alignItems:"center", gap:8}}>
                <Icon.alert style={{width:14, height:14, color:"var(--warn)"}}/>
                위험 메뉴 부록 (원가율 {riskThreshold}% 초과)
              </span>
            </div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width: 36}}>#</th>
                  <th>메뉴명</th>
                  <th style={{width: 90}}>카테고리</th>
                  <th style={{width: 100, textAlign:"right"}}>원가</th>
                  <th style={{width: 100, textAlign:"right"}}>판매가</th>
                  <th style={{width: 90, textAlign:"right"}}>원가율</th>
                </tr>
              </thead>
              <tbody>
                {riskMenus.map((m, i) => (
                  <tr key={m.name}>
                    <td className="num">{i+1}</td>
                    <td style={{fontWeight:700}}>{m.name}</td>
                    <td>
                      <span style={{display:"inline-flex", alignItems:"center", gap:6}}>
                        <span className="dot" style={{width:6, height:6, borderRadius:"50%", background: m.catColor}}></span>
                        {m.catLabel}
                      </span>
                    </td>
                    <td className="num right">{fmtKRW(m.cost)}원</td>
                    <td className="num right muted">{fmtKRW(m.sale)}원</td>
                    <td className="num right" style={{fontWeight:800, color:"var(--warn)"}}>
                      {m.rate.toFixed(1)}% ⚠
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="paper-pagebreak" style={{color:"var(--warn)"}}>
              총 {riskMenus.length}개 메뉴 — 단가 협상 · 판매가 조정 · 토핑 감량 검토 권장
            </div>
          </div>
        )}

        <div className="paper-foot">
          <span>1 / {REPORT_KINDS.cost.pages}</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}

Object.assign(window.Pages, {
  ReportLandingPage,
  ReportSalesPage,
  ReportPricePage,
  ReportShipmentPage,
  ReportMenuSalesComparePage,
  ReportCostPage,
});
