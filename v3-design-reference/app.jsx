/* global React, ReactDOM, Sidebar, TopBar, Dashboard, Icon, CommandPalette, Pages, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor, TweakSlider, TweakToggle, fmtKRW, ToastContainer, showToast */
const { useState, useEffect, useRef } = React;

/* 메뉴개발노트 / 송금 스타일 모달 */
function NewNoteModal({ onClose }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h2>새 테스트 노트</h2>
        <div className="lead">테스트 1회 = 노트 1개. 보고용 요약은 작성 후 한 번에 복사할 수 있어요.</div>

        <div className="recipient" style={{marginTop:20}}>
          <div className="avatar">🍕</div>
          <div style={{flex:1}}>
            <div className="name">피자 / 테스트 기록</div>
            <div className="acct">개발 구분 · 상태: 테스트중</div>
          </div>
          <button className="link">변경</button>
        </div>

        <div className="field">
          <label>메뉴명</label>
          <input className="input" placeholder="예: 횡성한우쉬림프" value={name} onChange={e=>setName(e.target.value)} />
        </div>

        <div className="field">
          <label>핵심 테스트 내용</label>
          <input className="input" placeholder="예: 와사비마요 조합 · 235도 4분 50초" />
        </div>

        <div className="field">
          <label>예상 원가 (원)</label>
          <input className="input huge num" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,""))} />
          <div className="quick-amount">
            {["1,000","3,000","5,000","10,000"].map(v=>(
              <button key={v} className="qa-pill" onClick={()=>setAmount(v.replace(/,/g,""))}>+{v}원</button>
            ))}
          </div>
        </div>

        <div className="fee">
          <Icon.alert style={{width:16,height:16,flex:"0 0 16px",color:"var(--accent)"}} />
          <div>
            <b>식자재 원가표</b>와 연동된 g·개당 단가로 자동 계산돼요. 단가 미연동 재료는 "확인 필요"로 표시됩니다.
          </div>
        </div>

        <div className="actions">
          <button className="btn ghost block" onClick={onClose}>취소</button>
          <button className="btn primary block" onClick={()=>{ showToast("테스트 노트가 저장됐어요", "ok"); onClose(); }}>저장하기</button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <h2>제때판매가 업로드</h2>
        <div className="lead">제때 상품 가격 파일(.xlsx · .csv)을 업로드하면 검증 후 미리보기를 보여드려요.</div>

        <div className="field">
          <label>파일 선택</label>
          <div style={{
            border:"2px dashed var(--border-strong)",
            borderRadius:16,
            padding:32,
            textAlign:"center",
            background:"var(--surface-2)"
          }}>
            <Icon.upload style={{width:32,height:32,color:"var(--text-3)"}}/>
            <div style={{marginTop:12, fontWeight:700}}>파일을 끌어다 놓거나 클릭해서 선택</div>
            <div style={{marginTop:4, fontSize:12, color:"var(--text-3)"}}>.xlsx · .csv · 최대 20MB</div>
          </div>
        </div>

        <div className="fee">
          <Icon.alert style={{width:16,height:16,flex:"0 0 16px",color:"var(--accent)"}} />
          <div>
            업로드 즉시 반영되지 않아요. <b>미리보기 확인 → 최신본으로 반영</b> 단계를 거칩니다.
          </div>
        </div>

        <div className="actions">
          <button className="btn ghost block" onClick={onClose}>취소</button>
          <button className="btn primary block" onClick={()=>{ showToast("파일 업로드 중... (데모)", "info"); onClose(); }}>파일 선택</button>
        </div>
      </div>
    </div>
  );
}

/* 빈 페이지 (다른 메뉴 클릭 시) */
function ComingSoon({ title }) {
  return (
    <main className="main">
      <div className="greet">
        <div>
          <h1>{title}</h1>
          <div className="sub">이 화면은 홈 대시보드 디자인과 같은 스타일로 제작 예정이에요.</div>
        </div>
      </div>
      <div className="card" style={{padding:80, textAlign:"center"}}>
        <Icon.beaker style={{width:48, height:48, color:"var(--text-4)", margin:"0 auto"}}/>
        <div style={{marginTop:16, fontSize:18, fontWeight:700}}>준비중</div>
        <div style={{marginTop:4, color:"var(--text-3)"}}>홈 대시보드를 먼저 확인해주세요.</div>
      </div>
    </main>
  );
}

const SECTION_TITLES = {
  home: "홈",
  "menu-sales": "메뉴 판매량",
  "menu-sales-upload":   "메뉴판매량 업로드",
  "menu-sales-rank":     "메뉴판매량 순위",
  "menu-sales-compare":  "메뉴판매량 비교",
  "menu-sales-unmatched":"메뉴미매칭 관리",
  "menu-sales-settings": "메뉴판매량 설정",
  "jette": "제때상품관리",
  "jette-price-compare": "제때 상품 가격 비교",
  "jette-shipment":      "제때 범용상품 출고량",
  "jette-settings":      "제때 상품 관리 설정",
  "cost": "원가계산",
  "cost-pizza-summary":    "피자 종합 원가표",
  "cost-pizza-detail":     "피자 세부 원가표",
  "cost-personal-summary": "1인피자 종합 원가표",
  "cost-personal-detail":  "1인피자 세부 원가표",
  "cost-side-summary":     "사이드 종합 원가표",
  "cost-side-detail":      "사이드 세부 원가표",
  "cost-set-summary":      "세트박스 종합 원가표",
  "cost-set-detail":       "세트박스 세부 원가표",
  "cost-edge-dough":       "엣지 & 도우 원가표",
  "cost-ingredient-price": "식자재 원가표",
  "cost-menu-price":       "메뉴 판매가 기준표",
  "cost-ingredient-usage": "식자재 사용 현황",
  "ingredient":            "식자재",
  "ingredient-list":       "식자재 리스트",
  "ingredient-issues":     "식자재 이슈",
  "ingredient-usage":      "식자재 사용 현황",
  "nutrition":             "영양성분",
  "nutrition-menu":        "메뉴 영양성분",
  "nutrition-allergen":    "알레르기 관리",
  "nutrition-compliance":  "표시 의무 점검",
  "menu-dev-note": "메뉴개발노트",
  "menu-dev-note-list":  "노트 목록",
  "menu-dev-note-write": "노트 작성",
  "report": "보고서센터",
  "report-sales":              "판매량 보고서",
  "report-cost":               "원가계산 보고서",
  "report-price":              "제때 가격 보고서",
  "report-shipment":           "제때 출고량 보고서",
  "report-menu-sales-compare": "판매량 비교 보고서",
  "settings": "설정 / 백업",
  "settings-backup":  "데이터 백업",
  "settings-restore": "데이터 복원",
  "settings-system":  "시스템 설정",
  "settings-account": "계정 관리",
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#3182F6",
  "density": "comfortable",
  "fontSize": 14,
  "scenario": "normal"
}/*EDITMODE-END*/;

function App() {
  const [active, setActive] = useState("home");
  const [prevActive, setPrevActive] = useState(null);
  const [exiting, setExiting] = useState(false);
  const [modal, setModal] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const navigate = (id) => {
    if (id === active) return;
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      setPrevActive(active);
      setActive(id);
    }, 160);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    document.documentElement.style.setProperty("--accent-text", tweaks.accent);
    document.documentElement.style.setProperty("--accent-press", tweaks.accent);
    document.documentElement.style.fontSize = tweaks.fontSize + "px";
  }, [tweaks]);

  // ⌘K / Ctrl+K — open command palette
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Palette navigation — handles regular routes AND special action tokens
  const navigateFromPalette = (to) => {
    if (to === "__upload") return setModal("upload");
    if (to === "__newnote") return setModal("note");
    navigate(to);
  };

  return (
    <div className={"app " + (mobileNav ? "nav-open" : "")}>
      <Sidebar active={active} onNav={(id)=>{ navigate(id); setMobileNav(false); }} />
      {mobileNav && <div className="nav-scrim" onClick={()=>setMobileNav(false)}></div>}
      <div>
        <TopBar
          onOpenPalette={()=>setPaletteOpen(true)}
          onToggleSidebar={()=>setMobileNav(v=>!v)}
        />
        <div key={active} className={exiting ? "page-exiting" : ""} style={!exiting ? {animation:"slide-up 280ms cubic-bezier(0.2,0.8,0.2,1) both"} : {}}>
        {(() => {
          if (active === "home") {
            return <Dashboard
              onOpenUpload={()=>setModal("upload")}
              onOpenNote={()=>navigate("menu-dev-note-write")}
              onNav={navigate}
            />;
          }
          if (active === "menu-sales-upload")       return <Pages.MenuSalesUploadPage />;
          if (active === "menu-sales-rank")        return <Pages.MenuSalesRankPage />;
          if (active === "menu-sales-compare")     return <Pages.MenuSalesComparePage />;
          if (active === "menu-sales-unmatched")   return <Pages.MenuSalesUnmatchedPage />;
          if (active === "menu-sales-settings")    return <Pages.MenuSalesSettingsPage />;
          if (active === "jette-price-compare")    return <Pages.JettePriceComparePage />;
          if (active === "jette-shipment")         return <Pages.JetteShipmentPage />;
          if (active === "jette-settings")         return <Pages.JetteSettingsPage />;
          if (active === "cost")                   return <Pages.CostLandingPage onNav={navigate} />;
          if (active === "cost-pizza-summary")     return <Pages.PizzaCostSummaryPage />;
          if (active === "cost-pizza-detail")      return <Pages.PizzaCostDetailPage />;
          if (active === "cost-personal-summary")  return <Pages.GenericSummaryPage kind="personal" />;
          if (active === "cost-personal-detail")   return <Pages.GenericDetailPage  kind="personal" />;
          if (active === "cost-side-summary")      return <Pages.GenericSummaryPage kind="side" />;
          if (active === "cost-side-detail")       return <Pages.GenericDetailPage  kind="side" />;
          if (active === "cost-set-summary")       return <Pages.GenericSummaryPage kind="set" />;
          if (active === "cost-set-detail")        return <Pages.GenericDetailPage  kind="set" />;
          if (active === "cost-edge-dough")        return <Pages.EdgeDoughCostPage />;
          if (active === "cost-menu-price")        return <Pages.MenuSalePricePage />;
          if (active === "cost-ingredient-usage")  return <Pages.IngredientUsagePage />;
          if (active === "cost-ingredient-price")  return <Pages.CostIngredientPricePage />;
          if (active === "ingredient-list")        return <Pages.IngredientListPage />;
          if (active === "ingredient-issues")      return <Pages.IngredientIssuesPage />;
          if (active === "ingredient-usage")       return <Pages.IngredientUsagePage />;
          if (active === "nutrition-menu")         return <Pages.NutritionMenuPage />;
          if (active === "nutrition-allergen")     return <Pages.AllergenPage />;
          if (active === "nutrition-compliance")   return <Pages.NutritionComplianceCheckPage />;
          if (active === "menu-dev-note-list")     return <Pages.MenuDevNoteListPage onWrite={()=>navigate("menu-dev-note-write")} />;
          if (active === "menu-dev-note-write")    return <Pages.MenuDevNoteWritePage onCancel={()=>navigate("menu-dev-note-list")} />;

          /* ----- 보고서센터 ----- */
          if (active === "report")                      return <Pages.ReportLandingPage onNav={navigate} />;
          if (active === "report-sales")                return <Pages.ReportSalesPage />;
          if (active === "report-cost")                 return <Pages.ReportCostPage />;
          if (active === "report-price")                return <Pages.ReportPricePage />;
          if (active === "report-shipment")             return <Pages.ReportShipmentPage />;
          if (active === "report-menu-sales-compare")   return <Pages.ReportMenuSalesComparePage />;

          /* ----- 설정 / 백업 ----- */
          if (active === "settings-backup")   return <Pages.SettingsBackupPage />;
          if (active === "settings-restore")  return <Pages.SettingsRestorePage />;
          if (active === "settings-system")   return <Pages.SettingsSystemPage />;
          if (active === "settings-account")  return <Pages.SettingsAccountPage />;

          return <ComingSoon title={SECTION_TITLES[active] || active} />;
        })()}
        </div>
      </div>

      {modal === "upload" && <UploadModal onClose={()=>setModal(null)} />}
      {modal === "note"   && <NewNoteModal onClose={()=>setModal(null)} />}

      <CommandPalette
        open={paletteOpen}
        onClose={()=>setPaletteOpen(false)}
        onNav={navigateFromPalette}
      />

      {/* 모바일 하단 탭바 */}
      <div className="bottom-tab-bar">
        <div className="tabs-inner">
          {[
            { id:"home",             label:"홈",     icon: Icon.home },
            { id:"menu-sales-rank",  label:"판매량", icon: Icon.chart, badge: 3 },
            { id:"cost-pizza-summary", label:"원가",   icon: Icon.calc },
            { id:"menu-dev-note-list", label:"노트",   icon: Icon.note },
            { id:"report",           label:"보고서", icon: Icon.doc },
          ].map(tab => (
            <button key={tab.id}
              className={"bottom-tab " + (active === tab.id || active.startsWith(tab.id.split("-")[0]) ? "active" : "")}
              onClick={() => navigate(tab.id)}>
              {tab.badge && <span className="tab-badge">{tab.badge}</span>}
              <tab.icon className="tab-ico" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <ToastContainer />

      <TweaksPanel title="Tweaks">
        <TweakSection label="테마">
          <TweakRadio
            label="모드"
            value={tweaks.theme}
            onChange={v=>setTweak("theme", v)}
            options={[{value:"light", label:"라이트"}, {value:"dark", label:"다크"}]}
          />
          <TweakColor
            label="액센트"
            value={tweaks.accent}
            onChange={v=>setTweak("accent", v)}
            options={["#3182F6", "#E1101F", "#1D766F", "#7C3AED"]}
          />
        </TweakSection>

        <TweakSection label="레이아웃">
          <TweakRadio
            label="밀도"
            value={tweaks.density}
            onChange={v=>setTweak("density", v)}
            options={[{value:"comfortable", label:"여유"}, {value:"compact", label:"빽빽"}]}
          />
          <TweakSlider
            label="글자 크기"
            min={12} max={16} step={1}
            value={tweaks.fontSize}
            onChange={v=>setTweak("fontSize", v)}
            unit="px"
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
