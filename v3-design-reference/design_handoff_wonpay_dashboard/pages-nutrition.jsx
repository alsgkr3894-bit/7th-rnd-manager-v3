/* global React, Icon, Pages, fmtKRW */
const { useState: useNT, useMemo: useNTMemo } = React;
const { PageHeader, FilterBar } = window.Pages;

/* ============================================================
   영양성분 데이터 (메뉴 1인분 기준)
============================================================ */
const NUTRITION_MENUS = [
  // 피자 L (1조각 기준 = 1/8)
  { name:"슈퍼콤비네이션 L", cat:"피자", serving:"1조각(약 110g)", kcal:285, carbs:32, protein:13, fat:11, sodium:680, sugar:3,
    allergens:["밀","우유","대두","돼지고기","쇠고기","토마토","난류"] },
  { name:"포테이토피자 L",   cat:"피자", serving:"1조각(약 105g)", kcal:268, carbs:34, protein:9,  fat:10, sodium:560, sugar:2,
    allergens:["밀","우유","대두","돼지고기","난류"] },
  { name:"불고기피자 L",     cat:"피자", serving:"1조각(약 115g)", kcal:295, carbs:31, protein:15, fat:12, sodium:740, sugar:4,
    allergens:["밀","우유","대두","쇠고기","난류"] },
  { name:"고르곤졸라 L",     cat:"피자", serving:"1조각(약 100g)", kcal:312, carbs:30, protein:14, fat:15, sodium:620, sugar:8,
    allergens:["밀","우유","대두","난류"] },
  { name:"새우파티 L",       cat:"피자", serving:"1조각(약 110g)", kcal:248, carbs:30, protein:14, fat:9,  sodium:710, sugar:3,
    allergens:["밀","우유","대두","새우","난류"] },
  { name:"하와이안 L",       cat:"피자", serving:"1조각(약 110g)", kcal:262, carbs:33, protein:11, fat:9,  sodium:620, sugar:6,
    allergens:["밀","우유","대두","돼지고기","난류"] },
  { name:"치즈피자 L",       cat:"피자", serving:"1조각(약 95g)",  kcal:240, carbs:28, protein:11, fat:10, sodium:520, sugar:2,
    allergens:["밀","우유","대두","난류"] },
  // 1인피자
  { name:"콤비 1인",          cat:"1인피자", serving:"1판(약 250g)",  kcal:580, carbs:62, protein:24, fat:24, sodium:1240, sugar:5,
    allergens:["밀","우유","대두","돼지고기","쇠고기","토마토","난류"] },
  // 사이드
  { name:"오븐스파게티",      cat:"사이드", serving:"1인분(280g)",   kcal:420, carbs:54, protein:15, fat:14, sodium:880, sugar:6,
    allergens:["밀","우유","토마토","돼지고기"] },
  { name:"치즈스틱",          cat:"사이드", serving:"4개(120g)",     kcal:340, carbs:28, protein:14, fat:18, sodium:610, sugar:1,
    allergens:["밀","우유","난류"] },
  { name:"치즈볼",            cat:"사이드", serving:"6개(150g)",     kcal:380, carbs:32, protein:12, fat:21, sodium:520, sugar:2,
    allergens:["밀","우유","난류"] },
  // 음료
  { name:"콜라 1.25L",        cat:"음료", serving:"100ml",          kcal:42,  carbs:11, protein:0,  fat:0,  sodium:5,   sugar:11,
    allergens:[] },
  { name:"사이다 1.25L",      cat:"음료", serving:"100ml",          kcal:40,  carbs:10, protein:0,  fat:0,  sodium:5,   sugar:10,
    allergens:[] },
];

// 식약처 22대 알레르기 유발 식품 (피자 매장에 해당하는 주요 항목)
const ALLERGEN_LIST = [
  "난류", "우유", "메밀", "땅콩", "대두", "밀", "고등어", "게",
  "새우", "돼지고기", "복숭아", "토마토", "아황산류", "호두",
  "닭고기", "쇠고기", "오징어", "조개류", "잣", "아몬드",
];

/* ============================================================
   Page: 메뉴 영양성분
============================================================ */
function NutritionMenuPage() {
  const [cat, setCat] = useNT("all");
  const [search, setSearch] = useNT("");
  const [sortKey, setSortKey] = useNT("kcal");
  const [sortDir, setSortDir] = useNT("desc");

  const cats = ["all", ...Array.from(new Set(NUTRITION_MENUS.map(m => m.cat)))];

  const filtered = useNTMemo(() => {
    let r = NUTRITION_MENUS;
    if (cat !== "all") r = r.filter(x => x.cat === cat);
    if (search.trim()) r = r.filter(x => x.name.includes(search.trim()));
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

  const avg = {
    kcal: Math.round(filtered.reduce((s,r)=>s+r.kcal,0) / (filtered.length || 1)),
    sodium: Math.round(filtered.reduce((s,r)=>s+r.sodium,0) / (filtered.length || 1)),
  };
  const highSodium = filtered.filter(r => r.sodium >= 1000).length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["영양성분", "메뉴 영양성분"]}
        title="메뉴 영양성분"
        sub="메뉴별 1인분 기준 영양 정보 — 식자재 영양 데이터에서 자동 산출돼요."
        actions={<>
          <button className="btn"><Icon.download style={{width:14, height:14}}/>CSV 내보내기</button>
          <button className="btn primary"><Icon.upload style={{width:14, height:14}}/>영양성분 업로드</button>
        </>}
      />

      {/* 베타 안내 */}
      <div className="info-banner info-accent">
        <div className="info-banner-ico" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}><Icon.beaker style={{width:16,height:16}}/></div>
        <div>
          <b>구현 중인 모듈 (베타)</b> · 현재 표시되는 값은 데모 데이터예요. 실제 운영 시 식약처 식품영양성분DB와 매장 레시피 기준으로 자동 산출됩니다.
        </div>
      </div>

      {/* 요약 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">평균 열량</div>
          <div className="stat-value num">{avg.kcal}<span className="unit">kcal</span></div>
          <div className="stat-foot">{filtered.length}개 메뉴 평균</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">평균 나트륨</div>
          <div className="stat-value num" style={{color: avg.sodium >= 800 ? "var(--warn)" : "var(--text-1)"}}>{avg.sodium}<span className="unit">mg</span></div>
          <div className="stat-foot">1일 권장량 2,000mg 대비 {Math.round((avg.sodium/2000)*100)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">고나트륨 메뉴</div>
          <div className="stat-value num" style={{color: highSodium > 0 ? "var(--negative)" : "var(--positive)"}}>{highSodium}<span className="unit">개</span></div>
          <div className="stat-foot">1,000mg 이상 함유</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">알레르기 표시 완료</div>
          <div className="stat-value num" style={{color:"var(--positive)"}}>{NUTRITION_MENUS.length}<span className="unit">/{NUTRITION_MENUS.length}</span></div>
          <div className="stat-foot">100% 표시 완료</div>
        </div>
      </div>

      <FilterBar
        search={search} onSearch={setSearch}
        chips={cats.map(c => ({
          label: c === "all" ? "전체" : c,
          count: c === "all" ? NUTRITION_MENUS.length : NUTRITION_MENUS.filter(x => x.cat === c).length,
          active: cat === c,
          onClick: () => setCat(c)
        }))}
      />

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={()=>toggleSort("name")} className="sortable">메뉴명 <SortIco active={sortKey==="name"} dir={sortDir}/></th>
              <th style={{width:90}}>카테고리</th>
              <th style={{width:160}}>1인분 기준</th>
              <th style={{width:110, textAlign:"right"}} onClick={()=>toggleSort("kcal")} className="sortable">열량 <SortIco active={sortKey==="kcal"} dir={sortDir}/></th>
              <th style={{width:110, textAlign:"right"}} onClick={()=>toggleSort("carbs")} className="sortable">탄수화물 <SortIco active={sortKey==="carbs"} dir={sortDir}/></th>
              <th style={{width:110, textAlign:"right"}} onClick={()=>toggleSort("protein")} className="sortable">단백질 <SortIco active={sortKey==="protein"} dir={sortDir}/></th>
              <th style={{width:90,  textAlign:"right"}} onClick={()=>toggleSort("fat")} className="sortable">지방 <SortIco active={sortKey==="fat"} dir={sortDir}/></th>
              <th style={{width:110, textAlign:"right"}} onClick={()=>toggleSort("sodium")} className="sortable">나트륨 <SortIco active={sortKey==="sodium"} dir={sortDir}/></th>
              <th style={{width:90, textAlign:"right"}}>당류</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.name}>
                <td className="cell-name"><div className="menu-name">{r.name}</div></td>
                <td><span className="cat-pill">{r.cat}</span></td>
                <td className="muted" style={{fontSize:12}}>{r.serving}</td>
                <td className="num right" style={{fontWeight: 800}}>{r.kcal}<span className="unit">kcal</span></td>
                <td className="num right">{r.carbs}<span className="unit">g</span></td>
                <td className="num right">{r.protein}<span className="unit">g</span></td>
                <td className="num right">{r.fat}<span className="unit">g</span></td>
                <td className="num right">
                  <span style={{color: r.sodium >= 1000 ? "var(--negative)" : r.sodium >= 700 ? "var(--warn)" : "var(--text-1)", fontWeight: r.sodium >= 700 ? 700 : 500}}>
                    {r.sodium}<span className="unit">mg</span>
                  </span>
                </td>
                <td className="num right muted">{r.sugar}<span className="unit">g</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ============================================================
   Page: 알레르기 관리
============================================================ */
function AllergenPage() {
  const [search, setSearch] = useNT("");
  const [selectedAllergen, setSelectedAllergen] = useNT(null);

  // 알레르기별 메뉴 수 집계
  const allergenCounts = ALLERGEN_LIST.map(a => ({
    name: a,
    count: NUTRITION_MENUS.filter(m => m.allergens.includes(a)).length,
  })).sort((a, b) => b.count - a.count);

  const activeAllergens = allergenCounts.filter(a => a.count > 0);

  const filteredMenus = selectedAllergen
    ? NUTRITION_MENUS.filter(m => m.allergens.includes(selectedAllergen))
    : NUTRITION_MENUS.filter(m => !search.trim() || m.name.includes(search.trim()));

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["영양성분", "알레르기 관리"]}
        title="알레르기 관리"
        sub="식약처 22대 알레르기 유발 식품 표시 — 메뉴별 함유 여부와 표시 의무를 관리해요."
      />

      <div className="info-banner">
        <div className="info-banner-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <b>식약처 알레르기 표시 의무 적용 매장</b> · 50평 이상 또는 가맹점 100개 이상 사업장은 메뉴별 알레르기 정보 표시가 의무예요. 표시 누락 시 과태료 부과 대상.
        </div>
      </div>

      {/* 알레르기별 함유 메뉴 카운트 카드 */}
      <div>
        <div className="cost-section-h">알레르기 유발 식품별 함유 메뉴</div>
        <div className="allergen-grid">
          {activeAllergens.map(a => (
            <button
              key={a.name}
              className={"allergen-card " + (selectedAllergen === a.name ? "active" : "")}
              onClick={()=>setSelectedAllergen(selectedAllergen === a.name ? null : a.name)}>
              <div className="allergen-name">{a.name}</div>
              <div className="allergen-count num">{a.count}<span className="unit">개</span></div>
              <div className="allergen-bar">
                <div className="allergen-bar-fill" style={{width:`${(a.count/NUTRITION_MENUS.length)*100}%`}}></div>
              </div>
            </button>
          ))}
        </div>
        {selectedAllergen && (
          <div style={{display:"flex", alignItems:"center", gap:10, marginTop:14, fontSize:13}}>
            <span className="chip" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}>
              {selectedAllergen} 함유 메뉴 필터됨
            </span>
            <button className="link" onClick={()=>setSelectedAllergen(null)}>필터 해제</button>
          </div>
        )}
      </div>

      {/* 메뉴별 알레르기 표시 */}
      <div className="card table-card">
        <div style={{padding:"20px 22px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap"}}>
          <div>
            <div className="card-title">메뉴별 알레르기 표시</div>
            <div className="card-sub">{selectedAllergen ? `${selectedAllergen} 함유 메뉴 ${filteredMenus.length}개` : `전체 ${filteredMenus.length}개 메뉴`}</div>
          </div>
          {!selectedAllergen && (
            <div className="filter-search" style={{width: 240}}>
              <Icon.search style={{width:14, height:14, color:"var(--text-3)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="메뉴 검색"/>
            </div>
          )}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>메뉴명</th>
              <th style={{width:90}}>카테고리</th>
              <th>알레르기 유발 식품</th>
              <th style={{width:80, textAlign:"right"}}>표시 의무</th>
            </tr>
          </thead>
          <tbody>
            {filteredMenus.map(m => (
              <tr key={m.name}>
                <td className="cell-name"><div className="menu-name">{m.name}</div></td>
                <td><span className="cat-pill">{m.cat}</span></td>
                <td>
                  {m.allergens.length === 0 ? (
                    <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>해당 없음</span>
                  ) : (
                    <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                      {m.allergens.map(a => (
                        <span key={a} className={"allergen-chip " + (selectedAllergen === a ? "active" : "")}>
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="num right">
                  <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>
                    <Icon.check style={{width:12, height:12}}/>완료
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
   Page: 표시 의무 점검 (자동 컴플라이언스 체크)
============================================================ */
function NutritionComplianceCheckPage() {
  const checks = [
    { id:1, item:"메뉴별 열량(kcal) 정보 등록",        rule:"식품등의 표시·광고에 관한 법률",       passed: 13, total: 13 },
    { id:2, item:"메뉴별 나트륨 함량 정보 등록",       rule:"식품등의 표시·광고에 관한 법률",       passed: 13, total: 13 },
    { id:3, item:"메뉴별 알레르기 유발 식품 표시",     rule:"식약처 알레르기 표시 의무",            passed: 13, total: 13 },
    { id:4, item:"고나트륨 메뉴 표시 (1일 권장량 ≥50%)", rule:"권장 표시 (의무 X)",                  passed: 12, total: 13, warning: true },
    { id:5, item:"당류 함량 정보 등록",                rule:"식품등의 표시·광고에 관한 법률",       passed: 13, total: 13 },
    { id:6, item:"트랜스지방 정보 등록",               rule:"가공식품 의무 (외식 권장)",             passed: 0,  total: 13, warning: true },
    { id:7, item:"포화지방 정보 등록",                 rule:"가공식품 의무 (외식 권장)",             passed: 0,  total: 13, warning: true },
    { id:8, item:"콜레스테롤 정보 등록",               rule:"권장 표시 (의무 X)",                   passed: 0,  total: 13, warning: true },
  ];

  const mandatoryChecks = checks.filter(c => !c.warning);
  const allMandatoryPassed = mandatoryChecks.every(c => c.passed === c.total);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["영양성분", "표시 의무 점검"]}
        title="표시 의무 점검"
        sub="식약처 식품 표시 의무 사항이 메뉴별로 모두 등록되어 있는지 자동 점검해요."
        actions={<button className="btn"><Icon.download style={{width:14, height:14}}/>점검 리포트 출력</button>}
      />

      {/* 종합 상태 */}
      <div className={"card compliance-status " + (allMandatoryPassed ? "ok" : "warn")}>
        <div className="compliance-ico">
          {allMandatoryPassed
            ? <Icon.check style={{width:32, height:32}}/>
            : <Icon.alert style={{width:32, height:32}}/>}
        </div>
        <div className="compliance-meta">
          <div className="compliance-title">
            {allMandatoryPassed ? "모든 의무 표시 완료" : "필수 항목 보완 필요"}
          </div>
          <div className="compliance-sub">
            의무 항목 {mandatoryChecks.filter(c=>c.passed===c.total).length}/{mandatoryChecks.length} 통과 · 권장 항목 {checks.filter(c=>c.warning && c.passed===c.total).length}/{checks.filter(c=>c.warning).length} 통과
          </div>
        </div>
        <div className="compliance-pct num">
          {Math.round((mandatoryChecks.filter(c=>c.passed===c.total).length / mandatoryChecks.length) * 100)}<span className="unit">%</span>
        </div>
      </div>

      {/* 점검 항목 리스트 */}
      <div className="card table-card">
        <div style={{padding:"20px 22px 12px"}}>
          <div className="card-title">표시 항목 체크리스트</div>
          <div className="card-sub">의무 항목은 모두 통과해야 해요 · 권장 항목은 매장 운영에 도움이 돼요</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:48}}></th>
              <th>점검 항목</th>
              <th>근거</th>
              <th style={{width:140}}>분류</th>
              <th style={{width:140, textAlign:"right"}}>통과 비율</th>
              <th style={{width:120}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {checks.map(c => {
              const isOk = c.passed === c.total;
              const pct = (c.passed / c.total) * 100;
              return (
                <tr key={c.id}>
                  <td>
                    <div className={"compliance-bullet " + (isOk ? "ok" : c.warning ? "warn" : "fail")}>
                      {isOk
                        ? <Icon.check style={{width:14, height:14}}/>
                        : <span style={{fontSize:12, fontWeight:800}}>!</span>}
                    </div>
                  </td>
                  <td className="cell-name"><div className="menu-name">{c.item}</div></td>
                  <td className="muted" style={{fontSize:12}}>{c.rule}</td>
                  <td>
                    {c.warning
                      ? <span className="chip" style={{background:"var(--surface-2)", color:"var(--text-3)"}}>권장</span>
                      : <span className="chip" style={{background:"var(--negative-soft)", color:"var(--negative)"}}>의무</span>}
                  </td>
                  <td className="num right">
                    <div className="share-cell">
                      <div className="share-mini">
                        <div className="share-mini-fill" style={{width: `${pct}%`, background: isOk ? "var(--positive)" : c.warning ? "var(--warn)" : "var(--negative)"}}></div>
                      </div>
                      <span style={{fontWeight: 700}}>{c.passed}/{c.total}</span>
                    </div>
                  </td>
                  <td>
                    {isOk
                      ? <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>완료</span>
                      : c.warning
                        ? <span className="chip" style={{background:"var(--warn-soft)", color:"var(--warn)"}}>미등록</span>
                        : <span className="chip" style={{background:"var(--negative-soft)", color:"var(--negative)"}}>보완 필요</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card warn-card">
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">표시 의무 위반 시</div>
          <div className="warn-text">
            <b>알레르기 표시 누락</b>은 1차 시정명령, 2차 과태료 300만원, 3차 과태료 600만원이 부과돼요. 메뉴 출시 전 반드시 점검이 필요해요.
          </div>
        </div>
      </div>
    </main>
  );
}

Object.assign(window.Pages, {
  NutritionMenuPage,
  AllergenPage,
  NutritionComplianceCheckPage,
});
