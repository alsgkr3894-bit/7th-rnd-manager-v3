/* global React, Icon */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
   Sidebar
============================================================ */
/* ============================================================
   Toast 시스템 (전역)
============================================================ */
function ToastContainer() {
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(() => {
    window._showToast = (msg, type = "ok", duration = 2800) => {
      const id = Date.now() + Math.random();
      setToasts(t => [...t, { id, msg, type }]);
      setTimeout(() => {
        setToasts(t => t.map(x => x.id === id ? { ...x, exiting: true } : x));
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 220);
      }, duration);
    };
    return () => { delete window._showToast; };
  }, []);
  const icons = {
    ok:    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="2,8 6,12 14,4"/></svg>,
    error: <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>,
    info:  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M8 7v5M8 5v.01"/></svg>,
    warn:  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M8 6v4M8 11.5v.5"/></svg>,
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={"toast " + t.type + (t.exiting ? " exit" : "")}>
          <div className={"toast-icon"}>{icons[t.type] || icons.ok}</div>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
const showToast = (msg, type, duration) => window._showToast?.(msg, type, duration);

function Sidebar({ active, onNav }) {
  const sidebarRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ top: 0, opacity: 0 });

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const activeEl = sidebar.querySelector(".nav-item.active, .nav-child.active");
    if (!activeEl) return;
    const sRect = sidebar.getBoundingClientRect();
    const eRect = activeEl.getBoundingClientRect();
    setPillStyle({ top: eRect.top - sRect.top + sidebar.scrollTop, opacity: 1 });
  }, [active]);

  const main = [
    { id: "home", label: "홈", icon: Icon.home },
    { id: "menu-sales", label: "메뉴 판매량", icon: Icon.chart, badge: 3, children: [
      { id: "menu-sales-upload",    label: "판매량 업로드" },
      { id: "menu-sales-rank",      label: "판매량 순위" },
      { id: "menu-sales-compare",   label: "판매량 비교" },
      { id: "menu-sales-unmatched", label: "미매칭 관리", badge: 4 },
      { id: "menu-sales-settings",  label: "설정" },
    ]},
    { id: "jette", label: "제때상품관리", icon: Icon.box, children: [
      { id: "jette-price-compare", label: "상품 가격 비교" },
      { id: "jette-shipment",      label: "범용상품 출고량" },
      { id: "jette-settings",      label: "설정" },
    ]},
    { id: "cost", label: "원가계산", icon: Icon.calc, children: [
      { id: "cost-pizza-summary",     label: "피자 종합 원가표" },
      { id: "cost-pizza-detail",      label: "피자 세부 원가표" },
      { id: "cost-personal-summary",  label: "1인피자 종합" },
      { id: "cost-personal-detail",   label: "1인피자 세부" },
      { id: "cost-side-summary",      label: "사이드 종합" },
      { id: "cost-side-detail",       label: "사이드 세부" },
      { id: "cost-set-summary",       label: "세트박스 종합" },
      { id: "cost-set-detail",        label: "세트박스 세부" },
      { id: "cost-edge-dough",        label: "엣지 & 도우" },
      { id: "cost-ingredient-price",  label: "식자재 원가표" },
      { id: "cost-menu-price",        label: "메뉴 판매가" },
    ]},
    { id: "ingredient", label: "식자재", icon: Icon.tag, children: [
      { id: "ingredient-list",   label: "식자재 리스트" },
      { id: "ingredient-issues", label: "식자재 이슈", badge: 3 },
      { id: "ingredient-usage",  label: "식자재 사용 현황" },
    ]},
    { id: "nutrition", label: "영양성분", icon: Icon.beaker, children: [
      { id: "nutrition-menu",       label: "메뉴 영양성분" },
      { id: "nutrition-allergen",   label: "알레르기 관리" },
      { id: "nutrition-compliance", label: "표시 의무 점검" },
    ]},
    { id: "menu-dev-note", label: "메뉴개발노트", icon: Icon.note, children: [
      { id: "menu-dev-note-list",  label: "노트 목록" },
      { id: "menu-dev-note-write", label: "노트 작성" },
    ]},
    { id: "report", label: "보고서센터", icon: Icon.doc, children: [
      { id: "report-sales",              label: "판매량 보고서" },
      { id: "report-cost",               label: "원가계산 보고서" },
      { id: "report-price",              label: "제때 가격 보고서" },
      { id: "report-shipment",           label: "출고량 보고서" },
      { id: "report-menu-sales-compare", label: "판매량 비교 보고서" },
    ]},
  ];
  const sys = [
    { id: "settings", label: "설정 / 백업", icon: Icon.gear, children: [
      { id: "settings-backup",  label: "데이터 백업" },
      { id: "settings-restore", label: "데이터 복원" },
      { id: "settings-system",  label: "시스템 설정" },
      { id: "settings-account", label: "계정 관리" },
    ]},
  ];

  // Track which top-level groups are expanded. A group auto-opens when one of
  // its children is active so deep-linking keeps the right rail visible.
  const [openIds, setOpenIds] = useState(() => {
    const all = [...main, ...sys];
    const opened = {};
    for (const g of all) {
      if (g.children?.some(c => c.id === active) || g.id === active) opened[g.id] = true;
    }
    return opened;
  });
  const toggle = (id) => setOpenIds(o => ({ ...o, [id]: !o[id] }));

  const renderGroup = (it) => {
    const hasKids = !!it.children?.length;
    const isActive = active === it.id || (hasKids && it.children.some(c => c.id === active));
    const isOpen = openIds[it.id];
    const handle = () => {
      if (hasKids) {
        toggle(it.id);
        // also surface the group landing (first child) when expanding fresh
        if (!isOpen && active !== it.id && !it.children.some(c => c.id === active)) {
          onNav(it.children[0].id);
        }
      } else {
        onNav(it.id);
      }
    };
    return (
      <div key={it.id}>
        <button className={"nav-item " + (isActive ? "active" : "")} onClick={handle}>
          <it.icon className="ico" />
          <span>{it.label}</span>
          {it.badge && <span className="badge">{it.badge}</span>}
          {hasKids && (
            <Icon.chevDown
              className="caret"
              style={{width:14, height:14, marginLeft: it.badge ? 6 : "auto",
                      transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 160ms ease", color:"var(--text-4)"}}
            />
          )}
        </button>
        {hasKids && (
          <div className={"nav-children " + (isOpen ? "open" : "")}>
            <div className="nav-children-inner">
              {it.children.map(c => (
                <button key={c.id}
                  className={"nav-child " + (active === c.id ? "active" : "")}
                  onClick={() => onNav(c.id)}>
                  <span className="dot"></span>
                  <span>{c.label}</span>
                  {c.badge && <span className="badge">{c.badge}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="sidebar" ref={sidebarRef}>
      <div className="sidebar-pill" style={{ top: pillStyle.top, opacity: pillStyle.opacity }} />
      <a className="brand" href="#" onClick={(e)=>{e.preventDefault();onNav("home")}}>
        <img className="logo-img" src="assets/logo-7thstreet.png" alt="7th Street Pizza" />
        <div className="brand-text">
          <div className="brand-line1">7번가 R&amp;D</div>
          <div className="brand-line2">플랫폼</div>
        </div>
      </a>

      <div className="section-label">메인</div>
      {main.map(renderGroup)}

      <div className="section-label">시스템</div>
      {sys.map(renderGroup)}

      <div className="sidebar-footer">
        <div><b>최신 제때 단가</b></div>
        <div style={{marginTop:4}}>2026.05.21 반영 · 정상</div>
      </div>
    </aside>
  );
}

/* ============================================================
   Top bar
============================================================ */
function TopBar({ onSend, onOpenPalette, onToggleSidebar }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return;
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [notifOpen]);

  const notifs = [
    { kind:"alert",  title:"모짜렌라치즈 단가 +3.8%", time:"방금 전", desc:"7,400원 → 7,680원 · 영향 메뉴 23개" },
    { kind:"info",   title:"4월 메뉴판매량 업로드 완료", time:"1시간 전", desc:"12,840건 처리 · 미매칭 4건 확인 필요" },
    { kind:"note",   title:"황성한우셰림프 테스트 노트 추가", time:"3시간 전", desc:"와사비마요 조합 · 재테스트 예정" },
    { kind:"ok",     title:"4월 판매량 보고서 생성 완료", time:"어제", desc:"전월 대비 +6.8%" },
  ];
  const meta = {
    alert: { bg:"var(--negative-soft)", color:"var(--negative)", ico:<Icon.alert style={{width:16,height:16}}/> },
    info:  { bg:"var(--accent-soft)",  color:"var(--accent-text)", ico:<Icon.upload style={{width:16,height:16}}/> },
    note:  { bg:"#F0EBFF", color:"#6B3FCB", ico:<Icon.beaker style={{width:16,height:16}}/> },
    ok:    { bg:"var(--positive-soft)", color:"var(--positive)", ico:<Icon.check style={{width:16,height:16}}/> },
  };

  return (
    <div className="topbar">
      <button className="icon-btn mobile-only" onClick={onToggleSidebar} title="메뉴">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>

      <div className="company-pick">
        <img className="company-logo" src="assets/logo-7thstreet.png" alt="" />
        <div>7번가피자 본사</div>
        <Icon.chevDown className="arrow" style={{width:14, height:14}} />
      </div>

      <button className="search" onClick={onOpenPalette} title="메뉴 · 재료 · 노트 통합 검색">
        <Icon.search style={{width:16, height:16}} />
        <span className="search-placeholder">메뉴, 재료, 보고서 검색</span>
        <kbd>⌘K</kbd>
      </button>

      <button className="icon-btn" title="새 노트">
        <Icon.plus style={{width:18, height:18}} />
      </button>

      <div className="notif-wrap" ref={notifRef}>
        <button className="icon-btn" title="알림" onClick={()=>setNotifOpen(v=>!v)}>
          <Icon.bell style={{width:18, height:18}} />
          <span className="dot"></span>
        </button>
        {notifOpen && (
          <div className="notif-pop">
            <div className="notif-head">
              <div className="notif-title">알림</div>
              <button className="link">모두 읽음</button>
            </div>
            <div className="notif-list">
              {notifs.map((n, i) => {
                const m = meta[n.kind];
                return (
                  <button className="notif-item" key={i}>
                    <div className="notif-ico" style={{background:m.bg, color:m.color}}>{m.ico}</div>
                    <div className="notif-body">
                      <div className="notif-row1">
                        <span className="notif-name">{n.title}</span>
                        <span className="notif-time">{n.time}</span>
                      </div>
                      <div className="notif-desc">{n.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="notif-foot">
              <button className="btn ghost" style={{width:"100%"}}>전체 알림 보기</button>
            </div>
          </div>
        )}
      </div>

      <div className="profile">
        <div className="avatar">민</div>
        <div className="who">
          <div className="name">민혁 책임</div>
          <div className="role">R&amp;D팀</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Command Palette (⌘K)
============================================================ */
function CommandPalette({ open, onClose, onNav }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(()=>inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const all = [
    { kind:"menu", label:"홈", to:"home", hint:"대시보드" },
    { kind:"menu", label:"메뉴판매량 순위", to:"menu-sales-rank" },
    { kind:"menu", label:"메뉴판매량 업로드", to:"menu-sales-upload" },
    { kind:"menu", label:"메뉴판매량 비교", to:"menu-sales-compare" },
    { kind:"menu", label:"메뉴미매칭 관리", to:"menu-sales-unmatched" },
    { kind:"menu", label:"제때 상품 가격 비교", to:"jette-price-compare" },
    { kind:"menu", label:"제때 출고량", to:"jette-shipment" },
    { kind:"menu", label:"피자 종합 원가표", to:"cost-pizza-summary" },
    { kind:"menu", label:"피자 세부 원가표", to:"cost-pizza-detail" },
    { kind:"menu", label:"식자재 원가표", to:"cost-ingredient-price" },
    { kind:"menu", label:"메뉴개발노트 목록", to:"menu-dev-note-list" },
    { kind:"menu", label:"노트 작성", to:"menu-dev-note-write" },
    { kind:"menu", label:"판매량 보고서", to:"report-sales" },
    { kind:"menu", label:"원가계산 보고서", to:"report-cost" },
    { kind:"action", label:"제때판매가 업로드", to:"__upload" },
    { kind:"action", label:"새 테스트 노트 작성", to:"__newnote" },
    { kind:"action", label:"데이터 백업 실행", to:"settings-backup" },
    { kind:"menu", label:"시스템 설정", to:"settings-system" },
  ];
  const norm = s => s.toLowerCase().replace(/\s+/g,"");
  const filtered = q.trim() ? all.filter(x => norm(x.label).includes(norm(q))) : all.slice(0, 8);

  const onPick = (item) => {
    onClose();
    onNav(item.to);
  };

  return (
    <div className="palette-scrim" onClick={onClose}>
      <div className="palette" onClick={e=>e.stopPropagation()}>
        <div className="palette-input">
          <Icon.search style={{width:18, height:18, color:"var(--text-3)"}} />
          <input ref={inputRef}
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>{
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered.length) onPick(filtered[0]);
            }}
            placeholder="메뉴, 재료, 보고서, 노트 검색"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-results">
          {filtered.length === 0 ? (
            <div className="palette-empty">검색 결과 없음</div>
          ) : (
            <>
              {["menu","action"].map(group => {
                const rows = filtered.filter(x => x.kind === group);
                if (!rows.length) return null;
                return (
                  <div key={group}>
                    <div className="palette-group">{group==="menu" ? "메뉴" : "빠른 작업"}</div>
                    {rows.map((r, i) => (
                      <button key={r.to} className="palette-row" onClick={()=>onPick(r)}>
                        <div className="palette-row-ico" style={{background: group==="menu" ? "var(--accent-soft)" : "var(--positive-soft)", color: group==="menu" ? "var(--accent-text)" : "var(--positive)"}}>
                          {group==="menu" ? <Icon.chevRight style={{width:14,height:14}}/> : <Icon.plus style={{width:14,height:14}}/>}
                        </div>
                        <span className="palette-row-label">{r.label}</span>
                        {r.hint && <span className="palette-row-hint">{r.hint}</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="palette-foot">
          <span><kbd>↑↓</kbd> 이동</span>
          <span><kbd>↵</kbd> 선택</span>
          <span><kbd>esc</kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Helpers — number formatting
============================================================ */
const fmtKRW = (n) => n.toLocaleString("ko-KR");
const fmtShort = (n) => {
  if (n >= 1e8) return (n/1e8).toFixed(1).replace(/\.0$/,"") + "억";
  if (n >= 1e4) return (n/1e4).toFixed(0) + "만";
  return n.toLocaleString();
};

/* ============================================================
   useCountUp — 숫자 카운트업 훅
============================================================ */
function useCountUp(target, { duration = 1200, delay = 0, decimals = 0 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let startTime = null;
    let rafId;
    const run = () => {
      rafId = requestAnimationFrame(function tick(now) {
        if (!startTime) startTime = now;
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = eased * target;
        setVal(decimals > 0 ? parseFloat(cur.toFixed(decimals)) : Math.round(cur));
        if (t < 1) rafId = requestAnimationFrame(tick);
        else setVal(target);
      });
    };
    const timer = delay > 0 ? setTimeout(run, delay) : (run(), null);
    return () => { if (timer) clearTimeout(timer); cancelAnimationFrame(rafId); };
  }, [target]);
  return val;
}

/* ============================================================
   Sparkline — tiny inline line chart  (드로우 애니메이션 포함)
============================================================ */
function Sparkline({ data, color = "var(--accent)", fill = true, height = 56 }) {
  const lineRef = useRef(null);
  const w = 320, h = height, pad = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = (w - pad*2) / (data.length - 1);
  const pts = data.map((v, i) => [pad + i*step, h - pad - ((v - min)/span) * (h - pad*2)]);
  const d = pts.map((p,i) => (i?"L":"M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const dArea = d + ` L ${(w-pad).toFixed(1)} ${(h-pad).toFixed(1)} L ${pad} ${(h-pad).toFixed(1)} Z`;
  const gid = useRef("sp-" + Math.random().toString(36).slice(2,8)).current;

  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    el.style.transition = "none";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)";
      el.style.strokeDashoffset = "0";
    }));
  }, [data]);

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={dArea} fill={`url(#${gid})`} style={{opacity:0, animation:"fade-in 600ms 400ms ease both"}} />
        </>
      )}
      <path ref={lineRef} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={color}
        style={{opacity:0, animation:"fade-in 200ms 920ms ease both"}} />
      <circle className="spark-pulse-ring" cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={color} opacity="0" />
    </svg>
  );
}

/* ============================================================
   Area chart — larger, with axis
============================================================ */
function AreaChart({ series, labels, height = 240, colors, formatY }) {
  const w = 760, h = height, padL = 36, padR = 12, padT = 16, padB = 28;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const allVals = series.flatMap(s => s.data);
  const max = Math.max(...allVals);
  const niceMax = Math.ceil(max / 1000) * 1000 * 1.1;
  const xs = labels.map((_, i) => padL + (labels.length === 1 ? innerW/2 : i * innerW / (labels.length - 1)));
  const yFor = v => padT + innerH - (v / niceMax) * innerH;

  const ticks = 4;
  const tickVals = Array.from({length: ticks+1}, (_, i) => Math.round(niceMax * i / ticks / 100)*100);

  const svgRef = useRef(null);
  const [hover, setHover] = useState(null); // { index, x, y }
  const handleMove = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * w;
    let bestI = 0, bestD = Infinity;
    xs.forEach((x, i) => { const d = Math.abs(x - px); if (d < bestD) { bestD = d; bestI = i; } });
    setHover({ index: bestI });
  };
  const handleLeave = () => setHover(null);

  return (
    <div className="chart-wrap">
      <svg ref={svgRef} className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
           onMouseMove={handleMove} onMouseLeave={handleLeave}>
        {/* grid */}
        {tickVals.map((v, i) => {
          const y = yFor(v);
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--divider)" />
              <text x={padL - 8} y={y + 4} fontSize="10" textAnchor="end" fill="var(--text-4)" fontWeight="600">{fmtShort(v)}</text>
            </g>
          );
        })}
        {/* x labels */}
        {labels.map((l, i) => (
          <text key={i} x={xs[i]} y={h - 8} fontSize="10" textAnchor="middle"
            fill={hover && hover.index===i ? "var(--text-1)" : "var(--text-4)"}
            fontWeight={hover && hover.index===i ? "800" : "600"}>{l}</text>
        ))}
        {/* series */}
        {series.map((s, si) => {
          const color = colors[si];
          const pts = s.data.map((v, i) => [xs[i], yFor(v)]);
          const d = pts.map((p,i) => (i?"L":"M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
          const dArea = d + ` L ${xs[xs.length-1].toFixed(1)} ${(padT+innerH).toFixed(1)} L ${xs[0].toFixed(1)} ${(padT+innerH).toFixed(1)} Z`;
          const gid = "ar-" + si;
          return (
            <g key={si}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={si===0?0.18:0.08}/>
                  <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={dArea} fill={`url(#${gid})`} />
              <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => {
                const isHover = hover && hover.index === i;
                const isLast = i === pts.length - 1;
                const r = isHover ? 5 : (isLast && si === 0 ? 4 : 0);
                return <circle key={i} cx={p[0]} cy={p[1]} r={r} fill={color} stroke="var(--surface)" strokeWidth="2" />;
              })}
            </g>
          );
        })}
        {/* hover guide line — 수직 */}
        {hover && (
          <line x1={xs[hover.index]} x2={xs[hover.index]} y1={padT} y2={padT+innerH}
                stroke="var(--text-4)" strokeDasharray="3 3" strokeWidth="1" />
        )}
        {/* hover guide line — 수평 (첫 번째 시리즈 기준) */}
        {hover && (
          <line className="chart-h-line"
            x1={padL} x2={xs[hover.index]}
            y1={yFor(series[0].data[hover.index])}
            y2={yFor(series[0].data[hover.index])} />
        )}
      </svg>
      {hover && (() => {
        const i = hover.index;
        const left = (xs[i] / w) * 100;
        const v0 = series[0].data[i], v1 = series[1] && series[1].data[i];
        const diff = v1 ? ((v0 - v1) / v1) * 100 : 0;
        return (
          <div className="chart-tip" style={{ left: `${left}%`, top: 8 }}>
            <div className="tip-label">{labels[i]}</div>
            {series.map((s, si) => (
              <div className="tip-row" key={si}>
                <span className="dot" style={{background: colors[si]}}></span>
                <span className="tip-name">{s.name}</span>
                <span className="tip-val num">{(formatY||fmtKRW)(s.data[i])}</span>
              </div>
            ))}
            {v1 && (
              <div className="tip-diff" style={{color: diff>=0?"var(--positive)":"var(--negative)"}}>
                {diff>=0?"▲":"▼"} {Math.abs(diff).toFixed(1)}%
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ============================================================
   Donut Ring  (스윕 애니메이션 + hover 효과 포함)
============================================================ */
function Donut({ items, size = 140, thickness = 14, onSegmentHover }) {
  const [ready, setReady] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  useEffect(() => {
    const r1 = requestAnimationFrame(() =>
      requestAnimationFrame(() => setReady(true))
    );
    return () => cancelAnimationFrame(r1);
  }, []);

  const r = (size - thickness)/2, c = 2*Math.PI*r;
  const total = items.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
      {items.map((it, i) => {
        const frac = it.value/total;
        const dash = c*frac;
        const offset = -c*acc;
        acc += frac;
        const isHovered = hoveredIdx === i;
        const sw = isHovered ? thickness + 5 : (hoveredIdx !== null ? thickness - 2 : thickness);
        return (
          <circle key={i} className="donut-seg"
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={it.color}
            strokeWidth={sw}
            strokeLinecap="butt"
            strokeDasharray={ready ? `${dash} ${c-dash}` : `0 ${c}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{
              transition: `stroke-dasharray 560ms cubic-bezier(0.16, 1, 0.3, 1) ${80 + i * 45}ms,
                           stroke-width 200ms ease,
                           opacity 200ms ease`,
              opacity: hoveredIdx !== null && !isHovered ? 0.45 : 1,
            }}
            onMouseEnter={() => { setHoveredIdx(i); onSegmentHover?.(i); }}
            onMouseLeave={() => { setHoveredIdx(null); onSegmentHover?.(null); }}
          />
        );
      })}
    </svg>
  );
}

Object.assign(window, { Sidebar, TopBar, CommandPalette, Sparkline, AreaChart, Donut, fmtKRW, fmtShort, useCountUp, ToastContainer, showToast });
