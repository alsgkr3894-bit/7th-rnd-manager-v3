/* global React, Icon, Pages, fmtKRW, fmtShort, AreaChart, showToast */
const { useState: useMS, useMemo: useMSMemo } = React;
const { PageHeader, FilterBar, RANK_CATEGORIES } = window.Pages;

/* ============================================================
   Page: 메뉴판매량 업로드
============================================================ */
function MenuSalesUploadPage() {
  const [stage, setStage] = useMS("idle"); // idle | validating | preview
  const [drag, setDrag] = useMS(false);
  const [selected, setSelected] = useMS(new Set());
  const [confirmDelete, setConfirmDelete] = useMS(false);

  const [history, setHistory] = useMS([
    { id: 5, period: "2026.05", name: "2026_05_판매량.xlsx", rows: 12840, errors: 0, warns: 4, status: "applied" },
    { id: 4, period: "2026.04", name: "2026_04_판매량.xlsx", rows: 14320, errors: 0, warns: 2, status: "applied" },
    { id: 3, period: "2026.04", name: "2026_04_보정.xlsx",   rows: 240,   errors: 0, warns: 0, status: "applied" },
    { id: 2, period: "2026.03", name: "2026_03_판매량.xlsx", rows: 13190, errors: 7, warns: 0, status: "failed" },
    { id: 1, period: "2026.02", name: "2026_02_판매량.xlsx", rows: 11860, errors: 0, warns: 1, status: "applied" },
  ]);

  const toggleSel = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === history.length) setSelected(new Set());
    else setSelected(new Set(history.map(h => h.id)));
  };
  const removeSelected = () => {
    setHistory(h => h.filter(x => !selected.has(x.id)));
    setSelected(new Set());
    setConfirmDelete(false);
  };

  const preview = [
    { row: 1, raw: "슈콤L",         matched: "슈퍼콤비네이션 L", qty: 142, warn: null },
    { row: 2, raw: "포테토 L",      matched: "포테이토피자 L",   qty: 87,  warn: null },
    { row: 3, raw: "치즈피자 라지", matched: "치즈피자 L",       qty: 64,  warn: "신뢰도 88% — 확인" },
    { row: 4, raw: "신메뉴-와규",   matched: "—",                qty: 28,  warn: "매칭 불가" },
  ];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴 판매량", "메뉴판매량 업로드"]}
        title="메뉴판매량 업로드"
        sub="엑셀 / CSV 파일을 업로드하면 검증·미리보기·반영 순서로 처리해요. 자동 덮어쓰기는 하지 않아요."
        actions={<button className="btn">onClick={()=>showToast("양식 다운로드 완료", "ok")}<Icon.download style={{width:14, height:14}}/>양식 다운로드</button>}
      />

      {/* 진행 스텝 */}
      <div className="step-bar">
        {[
          { id: "file",    label: "파일 선택",   active: stage === "idle" },
          { id: "validate",label: "검증",         active: stage === "validating" },
          { id: "preview", label: "미리보기",     active: stage === "preview" },
          { id: "apply",   label: "최신본 반영",  active: false },
        ].map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <div className="step-line"></div>}
            <div className={"step " + (s.active ? "active" : "") + (i === 0 || stage !== "idle" ? " visited" : "")}>
              <div className="step-num">{i + 1}</div>
              <div className="step-label">{s.label}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* 드롭존 + 미리보기 */}
      {stage !== "preview" ? (
        <div className={"card dropzone " + (drag ? "drag" : "")}
          onDragOver={e=>{e.preventDefault(); setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault(); setDrag(false); showToast("파일 업로드 중...", "info"); setStage("validating"); setTimeout(()=>{ setStage("preview"); showToast("검증 완료 — 12,840건 처리됐어요", "ok"); }, 800);}}
          onClick={()=>{ showToast("파일 업로드 중...", "info"); setStage("validating"); setTimeout(()=>{ setStage("preview"); showToast("검증 완료 — 12,840건 처리됐어요", "ok"); }, 800); }}
        >
          <div className="dropzone-ico"><Icon.upload style={{width:32, height:32}}/></div>
          <div className="dropzone-title">
            {stage === "validating" ? "검증 중..." : "엑셀(.xlsx) 또는 CSV 파일을 끌어다 놓으세요"}
          </div>
          <div className="dropzone-sub">또는 클릭해서 파일 선택 · 최대 20MB</div>
          <div className="dropzone-rules">
            <div className="rule-item">
              <Icon.check style={{width:14, height:14, color:"var(--positive)"}}/>
              <span>필수 컬럼: 메뉴명 · 판매수량 · 매출액</span>
            </div>
            <div className="rule-item">
              <Icon.check style={{width:14, height:14, color:"var(--positive)"}}/>
              <span>제품코드 누락은 식자재 원가표에만 차단 적용</span>
            </div>
            <div className="rule-item">
              <Icon.alert style={{width:14, height:14, color:"var(--warn)"}}/>
              <span>업로드 즉시 반영 안 함 — 미리보기 단계를 거쳐요</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="info-banner info-accent">
            <div className="info-banner-ico" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}><Icon.alert style={{width:16,height:16}}/></div>
            <div>
              <b>검증 완료 — 12,840건 중 4건 확인 필요</b> · 매칭 불가 1건, 신뢰도 90% 미만 1건. 반영하면 최신본으로 교체돼요.
            </div>
          </div>
          <div className="card table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width:60}}>행</th>
                  <th>엑셀 원본</th>
                  <th>매칭 결과</th>
                  <th style={{width:100, textAlign:"right"}}>수량</th>
                  <th style={{width:200}}>비고</th>
                </tr>
              </thead>
              <tbody>
                {preview.map(p => (
                  <tr key={p.row}>
                    <td className="muted mono">{p.row}</td>
                    <td className="cell-name"><div className="menu-name">{p.raw}</div></td>
                    <td>{p.matched === "—" ? <span className="muted">{p.matched}</span> : p.matched}</td>
                    <td className="num right">{p.qty}<span className="unit">건</span></td>
                    <td>
                      {p.warn
                        ? <span className="chip" style={{background:"var(--warn-soft)", color:"var(--warn)"}}>{p.warn}</span>
                        : <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>정상</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button className="btn" onClick={()=>setStage("idle")}>취소</button>
            <button className="btn primary" onClick={()=>{
                showToast("2026년 5월 판매량 데이터 반영 완료", "ok");
                setStage("idle");
              }}>
              <Icon.check style={{width:14, height:14}}/>최신본으로 반영
            </button>
          </div>
        </>
      )}

      {/* 업로드 이력 */}
      <div className="card table-card" style={{marginTop:8}}>
        <div className="history-head">
          <div>
            <div className="card-title">업로드 이력</div>
            <div className="card-sub">최근 업로드 기록 · 활성 데이터는 최신 1건만 유지</div>
          </div>
          {selected.size > 0 && (
            confirmDelete ? (
              <div className="bulk-bar danger-bar">
                <span className="bulk-count" style={{color:"var(--negative)"}}>
                  <b>{selected.size}건</b>을 삭제할까요? 되돌릴 수 없어요.
                </span>
                <button className="btn sm" onClick={()=>setConfirmDelete(false)}>취소</button>
                <button className="btn sm danger" onClick={removeSelected}>
                  삭제 확인
                </button>
              </div>
            ) : (
              <div className="bulk-bar">
                <span className="bulk-count"><b>{selected.size}건</b> 선택됨</span>
                <button className="btn sm" onClick={()=>setSelected(new Set())}>선택 해제</button>
                <button className="btn sm danger" onClick={()=>setConfirmDelete(true)}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6M10 11v6M14 11v6"/></svg>
                  선택 삭제
                </button>
              </div>
            )
          )}
        </div>
        {history.length === 0 ? (
          <div className="empty-state" style={{margin:"0 22px 22px"}}>
            <Icon.upload style={{width:36, height:36, color:"var(--text-4)"}}/>
            <div className="empty-title">업로드 이력이 비어있어요</div>
            <div className="empty-sub">위에서 새 파일을 업로드해보세요.</div>
          </div>
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:48}}>
                <label className="checkbox">
                  <input type="checkbox"
                    checked={selected.size === history.length && history.length > 0}
                    onChange={toggleAll}/>
                  <span className="checkmark"></span>
                </label>
              </th>
              <th style={{width:110}}>적용 년월</th>
              <th>파일명</th>
              <th style={{width:140, textAlign:"right"}}>처리 건수</th>
              <th style={{width:140, textAlign:"right"}}>오류 / 경고</th>
              <th style={{width:140}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => {
              const isSel = selected.has(h.id);
              return (
              <tr key={h.id} className={isSel ? "row-selected" : ""}
                  onClick={(e)=>{ if (e.target.tagName !== "INPUT") toggleSel(h.id); }}>
                <td onClick={e=>e.stopPropagation()}>
                  <label className="checkbox">
                    <input type="checkbox" checked={isSel} onChange={()=>toggleSel(h.id)}/>
                    <span className="checkmark"></span>
                  </label>
                </td>
                <td>
                  <span className="period-pill num">{h.period}</span>
                </td>
                <td className="cell-name"><div className="menu-name">{h.name}</div></td>
                <td className="num right">{fmtKRW(h.rows)}<span className="unit">건</span></td>
                <td className="num right">
                  <span style={{color: h.errors ? "var(--negative)" : "var(--text-3)", fontWeight: 700}}>{h.errors}</span>
                  <span className="unit"> / </span>
                  <span style={{color: h.warns ? "var(--warn)" : "var(--text-3)", fontWeight: 700}}>{h.warns}</span>
                </td>
                <td>
                  {h.status === "applied"
                    ? <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:"var(--positive)",display:"inline-block"}}></span>
                        반영 완료
                      </span>
                    : <span className="chip" style={{background:"var(--negative-soft)", color:"var(--negative)"}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:"var(--negative)",display:"inline-block"}}></span>
                        반영 실패
                      </span>}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   Page: 메뉴판매량 비교
============================================================ */
function MenuSalesComparePage() {
  const [tab, setTab] = useMS("yoy"); // yoy (전년동월) / mom (전월) / custom
  const [sortKey, setSortKey] = useMS("a");
  const [sortDir, setSortDir] = useMS("desc");

  const rows = [
    { name: "슈퍼콤비네이션 L", cat: "피자",    a: 8420, b: 7490, salesA: 25260000, salesB: 22470000 },
    { name: "포테이토피자 L",   cat: "피자",    a: 6890, b: 6550, salesA: 19292000, salesB: 18340000 },
    { name: "불고기피자 L",     cat: "피자",    a: 5640, b: 5760, salesA: 16920000, salesB: 17280000 },
    { name: "고르곤졸라 L",     cat: "피자",    a: 4720, b: 4340, salesA: 14160000, salesB: 13020000 },
    { name: "새우파티 L",       cat: "피자",    a: 4150, b: 4210, salesA: 14525000, salesB: 14735000 },
    { name: "치즈볼",            cat: "사이드",  a: 1840, b: 0,    salesA: 4600000,  salesB: 0 },
    { name: "할라피뇨 단독",    cat: "토핑",    a: 0,    b: 380,  salesA: 0,        salesB: 950000 },
    { name: "트러플 페퍼로니",  cat: "피자",    a: 2410, b: 1980, salesA: 10605000, salesB: 8712000 },
    { name: "씬도우 1인 콤비", cat: "1인피자", a: 2980, b: 2710, salesA: 4470000,  salesB: 4065000 },
    { name: "패밀리 박스 L",    cat: "세트박스",a: 1840, b: 1620, salesA: 11040000, salesB: 9720000 },
  ];

  const enriched = rows.map(r => {
    const diff = r.a - r.b;
    const pct = r.b === 0 ? null : ((r.a - r.b) / r.b) * 100;
    return { ...r, diff, pct };
  });

  // 칼럼 헤더 정렬 — 신규/단종 메뉴는 마지막으로 밀림
  const sorted = useMSMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...enriched].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      // null (증감률 - 신규 메뉴) 은 맨 끝으로
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") return va.localeCompare(vb, "ko") * dir;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }, [enriched, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const SortIco = ({ active, dir }) => (
    <span className={"sort-ico " + (active ? "active" : "")}>
      {active ? (dir === "asc" ? "▲" : "▼") : "▾"}
    </span>
  );

  const newMenus  = enriched.filter(r => r.b === 0 && r.a > 0);
  const droppedMenus = enriched.filter(r => r.a === 0 && r.b > 0);
  const topRise = [...enriched].filter(r => r.b > 0 && r.a > 0).sort((a,b) => b.pct - a.pct).slice(0, 3);
  const topFall = [...enriched].filter(r => r.b > 0 && r.a > 0).sort((a,b) => a.pct - b.pct).slice(0, 3);

  const totalA = enriched.reduce((s,r)=>s+r.a,0);
  const totalB = enriched.reduce((s,r)=>s+r.b,0);
  const totalPct = ((totalA - totalB) / totalB) * 100;

  const periodLabel = {
    yoy:    { a: "2026년 5월", b: "2025년 5월 (전년 동월)" },
    mom:    { a: "2026년 5월", b: "2026년 4월 (전월)" },
    custom: { a: "기간 A",     b: "기간 B" },
  }[tab];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴 판매량", "메뉴판매량 비교"]}
        title="메뉴판매량 비교"
        sub="두 기간의 판매량을 메뉴별로 비교하고, 신규·단종 메뉴를 자동 추출해요."
        actions={<>
          <button className="btn">onClick={()=>showToast("CSV 파일이 저장됐어요", "ok")}<Icon.download style={{width:14, height:14}}/>CSV 내보내기</button>
        </>}
      />

      {/* 기간 선택 */}
      <div className="period-bar">
        <div className="period-tabs">
          <button className={tab==="yoy"?"active":""} onClick={()=>setTab("yoy")}>전년 동월</button>
          <button className={tab==="mom"?"active":""} onClick={()=>setTab("mom")}>전월</button>
          <button className={tab==="custom"?"active":""} onClick={()=>setTab("custom")}>사용자 지정</button>
        </div>
        <div className="period-disp">
          <div className="period-side">
            <div className="period-label" style={{color:"var(--accent-text)"}}>● 기준 (A)</div>
            <div className="period-val">{periodLabel.a}</div>
          </div>
          <Icon.chevRight style={{width:18, height:18, color:"var(--text-4)"}}/>
          <div className="period-side">
            <div className="period-label" style={{color:"var(--text-3)"}}>● 비교 (B)</div>
            <div className="period-val">{periodLabel.b}</div>
          </div>
        </div>
      </div>

      {/* 비교 요약 */}
      <div className="hero-row">
        <div className="card balance-card">
          <div className="eyebrow">
            <Icon.chart style={{width:14, height:14}}/>총 판매량 비교
          </div>
          <div className="acct">{periodLabel.a} vs {periodLabel.b}</div>
          <div className="amount num">
            {fmtKRW(totalA)}<span className="unit">개</span>
          </div>
          <div className="delta" style={{color: totalPct >= 0 ? "#6FE6A8" : "#FF8C8C"}}>
            {totalPct >= 0 ? <Icon.arrowUp style={{width:14,height:14}}/> : <Icon.arrowDown style={{width:14,height:14}}/>}
            기준 대비 {totalPct >= 0 ? "+" : ""}{totalPct.toFixed(1)}% ({(totalA - totalB) >= 0 ? "+" : ""}{fmtKRW(totalA - totalB)}개)
          </div>
          <div style={{marginTop:20, fontSize:13, color:"rgba(255,255,255,0.6)", position:"relative", zIndex:1}}>
            <span style={{color:"rgba(255,255,255,0.9)", fontWeight:700}}>{fmtKRW(totalB)}개</span> → <span style={{color:"#fff", fontWeight:800}}>{fmtKRW(totalA)}개</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div>
            <div className="label">신규 출시 메뉴</div>
            <div className="value num" style={{color:"var(--positive)"}}>{newMenus.length}<span className="unit">개</span></div>
            <div className="trend">
              <span style={{color:"var(--text-3)"}}>비교 기간에 없던 메뉴</span>
            </div>
          </div>
          <div className="mini-list">
            {newMenus.slice(0, 3).map(m => (
              <div className="mini-row" key={m.name}>
                <span className="mini-name">{m.name}</span>
                <span className="mini-val num">+{fmtKRW(m.a)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card kpi-card">
          <div>
            <div className="label">단종·중단 메뉴</div>
            <div className="value num" style={{color:"var(--negative)"}}>{droppedMenus.length}<span className="unit">개</span></div>
            <div className="trend">
              <span style={{color:"var(--text-3)"}}>기준 기간에 판매 없음</span>
            </div>
          </div>
          <div className="mini-list">
            {droppedMenus.slice(0, 3).map(m => (
              <div className="mini-row" key={m.name}>
                <span className="mini-name">{m.name}</span>
                <span className="mini-val num" style={{color:"var(--negative)"}}>−{fmtKRW(m.b)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP 상승/하락 */}
      <div className="mid-row">
        <div className="card">
          <div className="card-header" style={{marginBottom:12}}>
            <div>
              <div className="card-title">TOP 상승 메뉴</div>
              <div className="card-sub">증가율 기준 상위 3개</div>
            </div>
            <Icon.arrowUp style={{width:16, height:16, color:"var(--positive)"}}/>
          </div>
          <div className="tx-list">
            {topRise.map((r, i) => (
              <div className="rank-row" key={r.name}>
                <div className="rank-num num" style={{color:"var(--positive)"}}>{i + 1}</div>
                <div className="rank-name">{r.name}</div>
                <div className="num" style={{fontWeight:800, color:"var(--positive)", whiteSpace:"nowrap"}}>
                  ▲ {r.pct.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{marginBottom:12}}>
            <div>
              <div className="card-title">TOP 하락 메뉴</div>
              <div className="card-sub">감소율 기준 상위 3개</div>
            </div>
            <Icon.arrowDown style={{width:16, height:16, color:"var(--negative)"}}/>
          </div>
          <div className="tx-list">
            {topFall.map((r, i) => (
              <div className="rank-row" key={r.name}>
                <div className="rank-num num" style={{color:"var(--negative)"}}>{i + 1}</div>
                <div className="rank-name">{r.name}</div>
                <div className="num" style={{fontWeight:800, color:"var(--negative)", whiteSpace:"nowrap"}}>
                  ▼ {Math.abs(r.pct).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 전체 비교 테이블 */}
      <div className="card table-card">
        <div style={{padding:"20px 22px 12px"}}>
          <div className="card-title">메뉴별 상세 비교</div>
          <div className="card-sub">정렬 가능 · 신규/단종 메뉴 포함</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={()=>toggleSort("name")} className="sortable">
                메뉴명 <SortIco active={sortKey==="name"} dir={sortDir}/>
              </th>
              <th style={{width:120}} onClick={()=>toggleSort("cat")} className="sortable">
                카테고리 <SortIco active={sortKey==="cat"} dir={sortDir}/>
              </th>
              <th style={{width:140, textAlign:"right"}} onClick={()=>toggleSort("a")} className="sortable">
                기준 (A) <SortIco active={sortKey==="a"} dir={sortDir}/>
              </th>
              <th style={{width:140, textAlign:"right"}} onClick={()=>toggleSort("b")} className="sortable">
                비교 (B) <SortIco active={sortKey==="b"} dir={sortDir}/>
              </th>
              <th style={{width:120, textAlign:"right"}} onClick={()=>toggleSort("diff")} className="sortable">
                증감 <SortIco active={sortKey==="diff"} dir={sortDir}/>
              </th>
              <th style={{width:120, textAlign:"right"}} onClick={()=>toggleSort("pct")} className="sortable">
                증감률 <SortIco active={sortKey==="pct"} dir={sortDir}/>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.name}>
                <td className="cell-name">
                  <div className="menu-name">{r.name}</div>
                  {r.b === 0 && <span className="tag-risk" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>신규</span>}
                  {r.a === 0 && <span className="tag-risk">단종</span>}
                </td>
                <td><span className="cat-pill">{r.cat}</span></td>
                <td className="num right">{r.a > 0 ? fmtKRW(r.a) : "—"}{r.a > 0 && <span className="unit">개</span>}</td>
                <td className="num right">{r.b > 0 ? fmtKRW(r.b) : "—"}{r.b > 0 && <span className="unit">개</span>}</td>
                <td className="num right" style={{color: r.diff >= 0 ? "var(--positive)" : "var(--negative)", fontWeight: 700}}>
                  {r.diff >= 0 ? "+" : ""}{fmtKRW(r.diff)}
                </td>
                <td className="num right">
                  {r.pct == null
                    ? <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>신규</span>
                    : r.a === 0
                      ? <span className="chip" style={{background:"var(--negative-soft)", color:"var(--negative)"}}>단종</span>
                      : <span style={{color: r.pct >= 0 ? "var(--positive)" : "var(--negative)", fontWeight: 700}}>
                          {r.pct >= 0 ? "▲" : "▼"} {Math.abs(r.pct).toFixed(1)}%
                        </span>}
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
   Page: 메뉴판매량 설정
============================================================ */
function MenuSalesSettingsPage() {
  const [autoMatch, setAutoMatch] = useMS(0.9);

  const [aliases, setAliases] = useMS([
    { id: 1, alias: "슈콤",      canonical: "슈퍼콤비네이션", count: 14, updated: "2026.04.18" },
    { id: 2, alias: "포테토",    canonical: "포테이토피자",   count: 8,  updated: "2026.04.10" },
    { id: 3, alias: "고곤졸라",  canonical: "고르곤졸라",     count: 5,  updated: "2026.03.22" },
    { id: 4, alias: "1인콤비",   canonical: "1인 콤비",       count: 3,  updated: "2026.03.15" },
    { id: 5, alias: "씬도우",    canonical: "씬도우 L",       count: 9,  updated: "2026.03.02" },
  ]);

  const [excluded, setExcluded] = useMS([
    { id: 1, name: "직원 시식용",     reason: "집계 대상 외",       since: "2025.10",   count: 142 },
    { id: 2, name: "행사 무료증정",   reason: "판매가 0원",         since: "2025.12",   count: 86 },
    { id: 3, name: "폐기 처리",       reason: "재고 손실 항목",     since: "2026.01",   count: 24 },
    { id: 4, name: "테스트 신메뉴",   reason: "정식 출시 전",       since: "2026.05",   count: 12 },
  ]);

  const [rules, setRules] = useMS([
    { id: 1, keyword: "피자",       category: "피자",         priority: 10, applies: 32 },
    { id: 2, keyword: "1인",        category: "1인피자",      priority: 20, applies: 8 },
    { id: 3, keyword: "크러스트, 도우, 엣지", category: "엣지&도우",     priority: 15, applies: 6 },
    { id: 4, keyword: "소스",       category: "사이드(소스)", priority: 25, applies: 5 },
    { id: 5, keyword: "콜라, 사이다, 음료", category: "음료",         priority: 30, applies: 4 },
    { id: 6, keyword: "추가",       category: "추가토핑",     priority: 18, applies: 7 },
    { id: 7, keyword: "하프",       category: "하프앤하프",   priority: 22, applies: 3 },
    { id: 8, keyword: "박스, 세트", category: "세트메뉴",     priority: 12, applies: 5 },
  ]);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴 판매량", "메뉴판매량 설정"]}
        title="메뉴판매량 설정"
        sub="별칭·제외 품목·분류 규칙을 관리해요. 변경 사항은 다음 업로드부터 적용돼요."
      />

      {/* 상단: 자동 매칭 신뢰도 임계값 (단독 카드) */}
      <div className="card threshold-card">
        <div className="threshold-meta">
          <div className="threshold-title">자동 매칭 신뢰도 임계값</div>
          <div className="threshold-desc">
            이 값 이상이면 미리보기에서 <b>자동 매칭</b>이 적용돼요. 미만은 사용자 확인이 필요해요.
          </div>
        </div>
        <div className="threshold-control">
          <div className="threshold-bar">
            <input type="range" min="0.7" max="1" step="0.01"
              value={autoMatch} onChange={e=>setAutoMatch(parseFloat(e.target.value))}/>
            <div className="threshold-val num">{Math.round(autoMatch * 100)}<span className="unit">%</span></div>
          </div>
          <div className="threshold-ticks">
            <span>70%</span><span>80%</span><span>90%</span><span>100%</span>
          </div>
        </div>
      </div>

      {/* 3개 관리 카드 — 균형 그리드 */}
      <div className="settings-3col">
        {/* 1) 메뉴별 별칭 관리 */}
        <div className="card mng-card">
          <div className="mng-head">
            <div>
              <div className="card-title">메뉴별 별칭 관리</div>
              <div className="card-sub">엑셀에서 자주 쓰는 줄임말을 정식 메뉴명으로 매핑</div>
            </div>
            <button className="btn sm"><Icon.plus style={{width:14, height:14}}/>추가</button>
          </div>
          <div className="mng-count">
            <span className="mng-count-num num">{aliases.length}</span>
            <span className="mng-count-label">개 별칭 등록됨</span>
          </div>
          <div className="mng-list">
            {aliases.map(a => (
              <div className="mng-row" key={a.id}>
                <div className="alias-from">{a.alias}</div>
                <Icon.chevRight style={{width:14, height:14, color:"var(--text-4)", flexShrink:0}}/>
                <div className="mng-main">
                  <div className="mng-name">{a.canonical}</div>
                  <div className="mng-meta">{a.count}회 적용 · {a.updated}</div>
                </div>
                <button className="mng-del" title="삭제"
                  onClick={()=>setAliases(list => list.filter(x => x.id !== a.id))}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2) 품목 제외 목록 */}
        <div className="card mng-card">
          <div className="mng-head">
            <div>
              <div className="card-title">품목 제외 목록</div>
              <div className="card-sub">집계·순위·매출 계산에서 빼는 항목</div>
            </div>
            <button className="btn sm"><Icon.plus style={{width:14, height:14}}/>추가</button>
          </div>
          <div className="mng-count">
            <span className="mng-count-num num" style={{color:"var(--warn)"}}>{excluded.length}</span>
            <span className="mng-count-label">개 품목 제외 중</span>
          </div>
          <div className="mng-list">
            {excluded.map(e => (
              <div className="mng-row" key={e.id}>
                <div className="excl-badge" title="제외됨">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>
                </div>
                <div className="mng-main">
                  <div className="mng-name">{e.name}</div>
                  <div className="mng-meta">{e.reason} · {e.since}부터 · 누적 {e.count}건</div>
                </div>
                <button className="mng-del" title="해제 (집계 다시 포함)"
                  onClick={()=>setExcluded(list => list.filter(x => x.id !== e.id))}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3) 분류 규칙 */}
        <div className="card mng-card">
          <div className="mng-head">
            <div>
              <div className="card-title">카테고리 분류 규칙</div>
              <div className="card-sub">메뉴명 키워드 → 카테고리 자동 분류</div>
            </div>
            <button className="btn sm"><Icon.plus style={{width:14, height:14}}/>추가</button>
          </div>
          <div className="mng-count">
            <span className="mng-count-num num" style={{color:"var(--accent-text)"}}>{rules.length}</span>
            <span className="mng-count-label">개 규칙 활성</span>
          </div>
          <div className="mng-list">
            {rules.map(r => (
              <div className="mng-row" key={r.id}>
                <div className="rule-kw">{r.keyword}</div>
                <Icon.chevRight style={{width:14, height:14, color:"var(--text-4)", flexShrink:0}}/>
                <div className="mng-main">
                  <div className="mng-name">
                    <span className="cat-pill" style={{
                      background: (RANK_CATEGORIES.find(c=>c.id===r.category)?.color || "var(--accent)") + "20",
                      color: RANK_CATEGORIES.find(c=>c.id===r.category)?.color || "var(--accent-text)"
                    }}>{r.category}</span>
                  </div>
                  <div className="mng-meta">우선순위 {r.priority} · {r.applies}개 메뉴 적용</div>
                </div>
                <button className="mng-del" title="삭제"
                  onClick={()=>setRules(list => list.filter(x => x.id !== r.id))}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card warn-card">
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">설정 변경 시 주의</div>
          <div className="warn-text">
            별칭·제외 품목·분류 규칙 변경은 <b>다음 업로드부터 적용</b>돼요. 과거 집계 결과를 다시 만들려면 백업 후 재업로드가 필요해요.
          </div>
        </div>
      </div>
    </main>
  );
}

function Toggle({ label, desc, checked, onChange, locked }) {
  return (
    <div className="setting-row">
      <div className="setting-meta">
        <div className="setting-name">{label}{locked && <span className="locked-badge">고정</span>}</div>
        <div className="setting-desc">{desc}</div>
      </div>
      <button
        className={"switch " + (checked ? "on" : "")}
        onClick={() => !locked && onChange(!checked)}
        disabled={locked}
        aria-checked={checked}
        role="switch">
        <span className="switch-thumb"></span>
      </button>
    </div>
  );
}

Object.assign(window.Pages, {
  MenuSalesUploadPage,
  MenuSalesComparePage,
  MenuSalesSettingsPage,
});
