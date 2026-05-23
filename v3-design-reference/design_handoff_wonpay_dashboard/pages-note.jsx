/* global React, Icon, Pages */
const { useState: useNState } = React;
const { PageHeader, FilterBar } = window.Pages;

/* ============================================================
   Page: 메뉴개발노트 목록
============================================================ */
function MenuDevNoteListPage({ onWrite }) {
  const [status, setStatus] = useNState("all");
  const [search, setSearch] = useNState("");

  const notes = [
    { id: 1, title: "횡성한우쉬림프 1차 테스트", menu: "횡성한우쉬림프", type: "테스트 기록", status: "테스트중",
      date: "2026-05-12", summary: "와사비마요 조합 · 235도 4분 50초 · 단맛 부족, 매콤한 페퍼 토핑 추가 검토.",
      tags: ["프리미엄","한우","2차필요"] },
    { id: 2, title: "골드스윗 엣지 단가 검토",   menu: "골드스윗크러스트 L", type: "원가 검토", status: "보고예정",
      date: "2026-05-10", summary: "크러스트치즈 단가 +4.2% 인상 영향 — 원가율 36.8% 도달, 판매가 조정 검토 필요.",
      tags: ["원가율","보고용"] },
    { id: 3, title: "비건 토마토 피자 아이디어", menu: "비건 토마토 (가칭)", type: "아이디어", status: "아이디어",
      date: "2026-05-08", summary: "치즈 대체재로 두부크림 사용. 비건 시장 진입 가능성 검토.",
      tags: ["비건","신메뉴"] },
    { id: 4, title: "트러플 페퍼로니 2차",       menu: "트러플 페퍼로니", type: "재테스트", status: "재테스트",
      date: "2026-05-05", summary: "1차 대비 트러플오일 사용량 줄임 (3g → 2g). 향 강도 적정, 단가 1,200원 절감.",
      tags: ["트러플","고급"] },
    { id: 5, title: "사이드 치즈볼 출시 후보",   menu: "치즈볼", type: "출시 후보", status: "보고예정",
      date: "2026-05-03", summary: "3차 테스트 완료. 식감·가격·원가율 모두 합격. 6월 상무님 보고 예정.",
      tags: ["사이드","출시"] },
    { id: 6, title: "씬도우 두께 0.5mm 조정",    menu: "씬도우 L", type: "개선 기록", status: "출시",
      date: "2026-04-28", summary: "기존 3.0mm → 2.5mm로 조정. 굽는 시간 -45초, 식감 개선 확인.",
      tags: ["도우","개선"] },
    { id: 7, title: "할라피뇨 토핑 폐기 검토",   menu: "할라피뇨 (단독)", type: "보류/폐기", status: "폐기",
      date: "2026-04-20", summary: "3개월간 사용 메뉴 1개, 폐기율 18% — 단독 토핑에서 제외, 매운맛 시리즈만 유지.",
      tags: ["폐기"] },
  ];

  const statusList = [
    { id: "all",      label: "전체",     count: notes.length },
    { id: "아이디어", label: "아이디어", count: notes.filter(n=>n.status==="아이디어").length },
    { id: "테스트중", label: "테스트중", count: notes.filter(n=>n.status==="테스트중").length },
    { id: "재테스트", label: "재테스트", count: notes.filter(n=>n.status==="재테스트").length },
    { id: "보고예정", label: "보고예정", count: notes.filter(n=>n.status==="보고예정").length },
    { id: "출시",     label: "출시",     count: notes.filter(n=>n.status==="출시").length },
    { id: "폐기",     label: "폐기",     count: notes.filter(n=>n.status==="폐기").length },
  ];

  const filtered = notes.filter(n => {
    if (status !== "all" && n.status !== status) return false;
    if (search.trim() && !(n.title + n.menu + n.summary).includes(search.trim())) return false;
    return true;
  });

  const statusColor = {
    "아이디어": { bg: "var(--surface-2)", color: "var(--text-2)" },
    "테스트중": { bg: "var(--accent-soft)", color: "var(--accent-text)" },
    "재테스트": { bg: "var(--warn-soft)", color: "var(--warn)" },
    "보고예정": { bg: "#F0EBFF", color: "#6B3FCB" },
    "출시":     { bg: "var(--positive-soft)", color: "var(--positive)" },
    "폐기":     { bg: "var(--negative-soft)", color: "var(--negative)" },
    "보류":     { bg: "var(--surface-2)", color: "var(--text-3)" },
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴개발노트", "노트 목록"]}
        title="메뉴개발노트"
        sub="테스트 1회 = 노트 1개. 총 17건의 R&D 기록이 있어요."
        actions={<button className="btn primary" onClick={onWrite}>
          <Icon.plus style={{width:14, height:14}}/>새 노트 작성
        </button>}
      />

      <FilterBar
        search={search} onSearch={setSearch}
        chips={statusList.map(s => ({
          label: s.label, count: s.count, active: status === s.id,
          onClick: () => setStatus(s.id),
        }))}
      />

      <div className="note-grid">
        {filtered.map(n => {
          const sc = statusColor[n.status] || statusColor["아이디어"];
          return (
            <button className="note-card" key={n.id}>
              <div className="note-card-head">
                <span className="chip" style={{background:sc.bg, color:sc.color}}>{n.status}</span>
                <span className="note-date">{n.date}</span>
              </div>
              <div className="note-card-title">{n.title}</div>
              <div className="note-card-menu">
                <Icon.pizza style={{width:14, height:14, color:"var(--text-3)"}}/>
                <span>{n.menu}</span>
                <span className="muted">·</span>
                <span className="muted">{n.type}</span>
              </div>
              <div className="note-card-summary">{n.summary}</div>
              <div className="note-card-tags">
                {n.tags.map(t => <span className="note-tag" key={t}>#{t}</span>)}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <Icon.beaker style={{width:40, height:40, color:"var(--text-4)"}}/>
            <div className="empty-title">조건에 맞는 노트가 없어요</div>
            <div className="empty-sub">필터를 바꾸거나 새 노트를 작성해보세요.</div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   Page: 노트 작성
============================================================ */
function MenuDevNoteWritePage({ onCancel }) {
  const [form, setForm] = useNState({
    title: "",
    menu: "",
    devType: "피자",
    status: "테스트중",
    testDate: "2026-05-22",
    coreTest: "",
    materials: "",
    taste: "",
    feedback: "",
    cost: "",
    improve: "",
    nextAction: "",
    reportSummary: "",
    tags: "",
  });
  const [copied, setCopied] = useNState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const devTypes = ["피자", "사이드", "소스", "도우(엣지)", "토핑", "기타"];
  const statuses = ["아이디어", "테스트중", "재테스트", "보고예정", "보류", "출시", "폐기"];

  const reportText = `[메뉴개발노트 보고용]
메뉴명: ${form.menu || "—"}
개발 구분: ${form.devType}
테스트 날짜: ${form.testDate}
테스트 내용: ${form.coreTest || "—"}
결과: ${form.taste || "—"}
다음 액션: ${form.nextAction || "—"}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(()=>setCopied(false), 1800);
    } catch(e) {}
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴개발노트", "노트 작성"]}
        title="새 메뉴개발노트"
        sub="필수 항목을 입력하면 보고용 요약이 자동 생성돼요."
        actions={<>
          <button className="btn" onClick={onCancel}>취소</button>
          <button className="btn primary">
            <Icon.check style={{width:14,height:14}}/>저장하기
          </button>
        </>}
      />

      <div className="form-grid">
        {/* 왼쪽 — 입력 영역 */}
        <div className="form-main">
          <div className="card form-section">
            <div className="section-h">필수 항목</div>
            <div className="form-row">
              <Field label="제목" required>
                <input className="input" placeholder="예: 횡성한우쉬림프 1차 테스트"
                  value={form.title} onChange={e=>upd("title", e.target.value)} />
              </Field>
            </div>
            <div className="form-row two">
              <Field label="메뉴명" required>
                <input className="input" placeholder="예: 횡성한우쉬림프"
                  value={form.menu} onChange={e=>upd("menu", e.target.value)} />
              </Field>
              <Field label="테스트 날짜">
                <input className="input" type="date"
                  value={form.testDate} onChange={e=>upd("testDate", e.target.value)} />
              </Field>
            </div>
            <div className="form-row two">
              <Field label="개발 구분" required>
                <div className="seg-row">
                  {devTypes.map(t => (
                    <button key={t}
                      className={"seg-pill " + (form.devType === t ? "active" : "")}
                      onClick={()=>upd("devType", t)}>{t}</button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="form-row">
              <Field label="상태" required>
                <div className="seg-row">
                  {statuses.map(s => (
                    <button key={s}
                      className={"seg-pill " + (form.status === s ? "active" : "")}
                      onClick={()=>upd("status", s)}>{s}</button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="form-row">
              <Field label="핵심 테스트 내용" required>
                <textarea className="input textarea"
                  placeholder="예: 와사비마요 조합 · 235도 4분 50초"
                  value={form.coreTest} onChange={e=>upd("coreTest", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="card form-section">
            <div className="section-h">상세 기록 (선택)</div>
            <div className="form-row two">
              <Field label="사용 재료">
                <textarea className="input textarea"
                  placeholder="재료명과 사용량을 입력하세요. 예: 피자소스 50g, 모짜렐라치즈 80g"
                  value={form.materials} onChange={e=>upd("materials", e.target.value)} />
              </Field>
              <Field label="예상 원가" hint="식자재 원가표 연동 자동 계산 예정">
                <input className="input" placeholder="0" value={form.cost}
                  onChange={e=>upd("cost", e.target.value.replace(/\D/g,""))}/>
              </Field>
            </div>
            <div className="form-row two">
              <Field label="맛 평가">
                <textarea className="input textarea"
                  placeholder="식감, 향, 단맛/짠맛 균형 등"
                  value={form.taste} onChange={e=>upd("taste", e.target.value)} />
              </Field>
              <Field label="상무님·실장님 평가">
                <textarea className="input textarea"
                  placeholder="피드백 받은 내용"
                  value={form.feedback} onChange={e=>upd("feedback", e.target.value)} />
              </Field>
            </div>
            <div className="form-row two">
              <Field label="개선점">
                <textarea className="input textarea"
                  placeholder="다음 시도에서 보완할 점"
                  value={form.improve} onChange={e=>upd("improve", e.target.value)} />
              </Field>
              <Field label="다음 액션">
                <textarea className="input textarea"
                  placeholder="언제 무엇을 다시 테스트할지"
                  value={form.nextAction} onChange={e=>upd("nextAction", e.target.value)} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="태그" hint="쉼표로 구분 — 예: 매운맛, 치즈강화">
                <input className="input" placeholder="매운맛, 치즈강화, 프리미엄"
                  value={form.tags} onChange={e=>upd("tags", e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* 오른쪽 — 보고용 미리보기 */}
        <div className="form-side">
          <div className="card report-card">
            <div className="card-header" style={{marginBottom:12}}>
              <div>
                <div className="card-title">보고용 요약</div>
                <div className="card-sub">한 번에 복사해서 보고에 사용</div>
              </div>
            </div>
            <pre className="report-pre">{reportText}</pre>
            <button className={"btn block " + (copied ? "" : "primary")} onClick={onCopy}>
              {copied
                ? <><Icon.check style={{width:14,height:14}}/>복사됨!</>
                : <>📋 클립보드에 복사</>}
            </button>
            <div className="report-hint">카톡·단톡 보고, 상무님 보고, 회의 공유에 바로 활용하세요.</div>
          </div>

          <div className="card warn-card">
            <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
            <div>
              <div className="warn-title">자동 저장 안 함</div>
              <div className="warn-text">실수 저장 방지를 위해 명시적 <b>저장</b> 버튼을 누르셔야 기록돼요. (CLAUDE.md 정책)</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="field-block">
      <div className="field-label-row">
        <label className="field-label">{label}{required && <span className="req">*</span>}</label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

Object.assign(window.Pages, { MenuDevNoteListPage, MenuDevNoteWritePage });
