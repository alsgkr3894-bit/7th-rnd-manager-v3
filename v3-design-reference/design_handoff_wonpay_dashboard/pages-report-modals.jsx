/* global React, Icon, fmtKRW */
const { useState: useRM, useEffect: useRMEffect, useMemo: useRMMemo, useRef: useRMRef } = React;

/* ============================================================
   ShareLinkModal — 외부 공유 가능 URL 발급 & 관리
============================================================ */
const EXPIRY_OPTIONS = [
  { value: "7d",       label: "7일",     hint: "기본" },
  { value: "30d",      label: "30일",    hint: "정기 검토용" },
  { value: "90d",      label: "90일",    hint: "분기 보고" },
  { value: "never",    label: "무기한",  hint: "위험 — 신중히" },
];

const DEMO_ACTIVE_LINKS = [
  { id: "L-7H2K9X", expiry: "30d", expiresAt: "2026.06.20", views: 12, lastView: "오늘 14:32", protected: true,  watermark: true,  download: false, audience: "상무 김재혁 그룹" },
  { id: "L-A4B82Q", expiry: "7d",  expiresAt: "2026.05.29", views: 3,  lastView: "어제 18:42", protected: false, watermark: true,  download: true,  audience: "외주 컨설턴트" },
];

function ShareLinkModal({ report, onClose }) {
  const [expiry, setExpiry]       = useRM("30d");
  const [usePass, setUsePass]     = useRM(true);
  const [pass, setPass]           = useRM("");
  const [watermark, setWatermark] = useRM(true);
  const [allowDownload, setAllow] = useRM(false);
  const [audience, setAudience]   = useRM("private");
  const [generated, setGenerated] = useRM(null); // { url, ... }
  const [copied, setCopied]       = useRM(false);
  const inputRef = useRMRef(null);

  // 자동 패스워드 생성
  useRMEffect(() => {
    if (usePass && !pass) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let s = "";
      for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
      setPass(s);
    }
  }, [usePass]);

  const linkId = useRMMemo(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return "L-" + s;
  }, []);

  const expiresAt = useRMMemo(() => {
    if (expiry === "never") return "만료 없음";
    const d = new Date("2026-05-22");
    const days = { "7d": 7, "30d": 30, "90d": 90 }[expiry] || 30;
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
  }, [expiry]);

  const onGenerate = () => {
    const url = `https://share.wonpay.kr/r/${linkId.toLowerCase()}`;
    setGenerated({ url, linkId, expiresAt, watermark, allowDownload, protected: usePass, pass });
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(generated.url);
      setCopied(true);
      setTimeout(()=>setCopied(false), 1800);
    } catch(e) {
      // fallback — select the input
      inputRef.current?.select();
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal modal-share" onClick={e=>e.stopPropagation()}>
        <div className="share-head">
          <div className="share-head-ico"><Icon.upload style={{width:18, height:18}}/></div>
          <div style={{flex:1}}>
            <h2 style={{fontSize:18}}>공유 링크 발급</h2>
            <div className="lead" style={{marginTop:2}}>
              <b style={{color:"var(--text-1)"}}>{report?.name || "보고서"}</b>
            </div>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="닫기">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        {!generated ? (
          <>
            {/* 만료 기간 */}
            <div className="share-section">
              <div className="share-label">만료 기간</div>
              <div className="share-expiry-grid">
                {EXPIRY_OPTIONS.map(o => (
                  <button key={o.value}
                    className={"share-expiry " + (expiry === o.value ? "active" : "") + (o.value === "never" ? " danger" : "")}
                    onClick={()=>setExpiry(o.value)}>
                    <div className="share-expiry-label">{o.label}</div>
                    <div className="share-expiry-hint">{o.hint}</div>
                  </button>
                ))}
              </div>
              <div className="share-meta-row">
                <Icon.alert style={{width:12, height:12, color:"var(--text-3)"}}/>
                <span>만료일: <b className="mono">{expiresAt}</b> · 만료 후 링크 자동 비활성화</span>
              </div>
            </div>

            {/* 보안 옵션 */}
            <div className="share-section">
              <div className="share-label">보안</div>
              <label className="share-toggle-row">
                <div className="share-toggle-meta">
                  <div className="share-toggle-name">비밀번호 보호</div>
                  <div className="share-toggle-desc">링크 접속 시 8자 비밀번호 입력 필요</div>
                </div>
                <button className={"switch " + (usePass?"on":"")} onClick={()=>setUsePass(v=>!v)}>
                  <span className="switch-thumb"></span>
                </button>
              </label>
              {usePass && (
                <div className="share-pass-box">
                  <div className="share-pass-label">비밀번호</div>
                  <div className="share-pass-row">
                    <input className="input mono" style={{letterSpacing:"0.2em", fontWeight:700, fontSize:16}}
                      value={pass} onChange={e=>setPass(e.target.value.toUpperCase().slice(0,12))}/>
                    <button className="btn sm" onClick={()=>{
                      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                      let s = "";
                      for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
                      setPass(s);
                    }}>재생성</button>
                  </div>
                  <div className="share-pass-hint">받는 분에게 링크와 별도 채널로 전달하세요</div>
                </div>
              )}

              <label className="share-toggle-row">
                <div className="share-toggle-meta">
                  <div className="share-toggle-name">워터마크 표시</div>
                  <div className="share-toggle-desc">"외부 공유 — 기밀" 워터마크 PDF에 자동 삽입</div>
                </div>
                <button className={"switch " + (watermark?"on":"")} onClick={()=>setWatermark(v=>!v)}>
                  <span className="switch-thumb"></span>
                </button>
              </label>

              <label className="share-toggle-row">
                <div className="share-toggle-meta">
                  <div className="share-toggle-name">다운로드 허용</div>
                  <div className="share-toggle-desc">끄면 브라우저에서 미리보기만 가능</div>
                </div>
                <button className={"switch " + (allowDownload?"on":"")} onClick={()=>setAllow(v=>!v)}>
                  <span className="switch-thumb"></span>
                </button>
              </label>
            </div>

            {/* 수신자 */}
            <div className="share-section">
              <div className="share-label">수신 대상 (기록용)</div>
              <div className="seg-row">
                {[
                  {value:"private",  label:"내부 (상무·실장)"},
                  {value:"vendor",   label:"외주 / 협력사"},
                  {value:"public",   label:"공개 — 누구나"},
                ].map(o => (
                  <button key={o.value}
                    className={"seg-pill " + (audience === o.value ? "active" : "")}
                    onClick={()=>setAudience(o.value)}>{o.label}</button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn block" onClick={onClose}>취소</button>
              <button className="btn primary block" onClick={onGenerate}>
                <Icon.upload style={{width:14, height:14}}/>링크 생성
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 생성된 링크 */}
            <div className="share-success">
              <div className="share-success-ico"><Icon.check style={{width:18, height:18}}/></div>
              <div>
                <div style={{fontWeight:800, fontSize:14, color:"var(--positive)"}}>공유 링크 발급 완료</div>
                <div style={{fontSize:12, color:"var(--text-3)", marginTop:2}}>아래 링크를 복사해 전달하세요 — 활동 로그가 기록돼요.</div>
              </div>
            </div>

            <div className="share-url-box">
              <input ref={inputRef} readOnly value={generated.url}
                className="share-url-input mono" onClick={e=>e.target.select()}/>
              <button className={"btn " + (copied?"":"primary")} onClick={onCopy} style={{minWidth:88}}>
                {copied ? <><Icon.check style={{width:14, height:14}}/>복사됨</> : "복사"}
              </button>
            </div>

            <div className="share-summary">
              <div className="share-summary-row">
                <span className="share-summary-k">링크 ID</span>
                <span className="mono">{generated.linkId}</span>
              </div>
              <div className="share-summary-row">
                <span className="share-summary-k">만료일</span>
                <span className="mono"><b>{generated.expiresAt}</b></span>
              </div>
              <div className="share-summary-row">
                <span className="share-summary-k">비밀번호</span>
                <span>
                  {generated.protected
                    ? <span className="mono" style={{background:"var(--surface-2)", padding:"2px 8px", borderRadius:6, letterSpacing:"0.15em", fontWeight:700}}>{generated.pass}</span>
                    : <span className="muted">없음</span>}
                </span>
              </div>
              <div className="share-summary-row">
                <span className="share-summary-k">권한</span>
                <span>{generated.allowDownload ? "조회 + 다운로드" : "조회만"}{generated.watermark && " · 워터마크"}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn block" onClick={onClose}>닫기</button>
              <button className="btn primary block" onClick={onCopy}>
                <Icon.upload style={{width:14, height:14}}/>{copied ? "복사됨!" : "링크 복사"}
              </button>
            </div>
          </>
        )}

        {/* 활성 링크 목록 — 항상 표시 */}
        {!generated && DEMO_ACTIVE_LINKS.length > 0 && (
          <div className="share-active">
            <div className="share-active-h">이 보고서의 활성 링크 ({DEMO_ACTIVE_LINKS.length})</div>
            {DEMO_ACTIVE_LINKS.map(l => (
              <div className="share-active-row" key={l.id}>
                <div className="share-active-left">
                  <div className="share-active-id">
                    <span className="mono" style={{fontWeight:700}}>{l.id}</span>
                    {l.protected && <span className="chip" style={{background:"var(--surface-2)", color:"var(--text-2)", fontSize:10}}>🔒 보호</span>}
                  </div>
                  <div className="share-active-meta">
                    {l.audience} · 만료 {l.expiresAt} · {l.views}회 조회 · {l.lastView}
                  </div>
                </div>
                <div className="share-active-actions">
                  <button className="btn sm">복사</button>
                  <button className="btn sm" style={{color:"var(--negative)"}}>폐기</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ScheduleManagerModal — 정기 자동 보고서 관리
============================================================ */
const DEMO_SCHEDULES = [
  {
    id: "SCH-001", name: "주간 제때 가격 보고서", kind: "price",
    cadence: "매주 월요일 09:00", next: "2026.05.28 09:00",
    recipients: ["민혁 책임", "지영 매니저"], channel: ["email"],
    active: true,
  },
  {
    id: "SCH-002", name: "월간 판매량 보고서", kind: "sales",
    cadence: "매월 1일 09:00", next: "2026.06.01 09:00",
    recipients: ["상무 김재혁", "실장 박서연", "민혁 책임"], channel: ["email", "kakao"],
    active: true,
  },
  {
    id: "SCH-003", name: "월간 원가계산 보고서", kind: "cost",
    cadence: "매월 3일 09:00", next: "2026.06.03 09:00",
    recipients: ["상무 김재혁", "민혁 책임"], channel: ["email"],
    active: true,
  },
  {
    id: "SCH-004", name: "분기 비교 보고서", kind: "compare",
    cadence: "분기 첫째 월요일",  next: "2026.07.06 09:00",
    recipients: ["상무 김재혁"], channel: ["email"],
    active: false,
  },
];

const KIND_CHIP_LOCAL = {
  sales:    { bg: "var(--accent-soft)",    color: "var(--accent-text)",  label: "판매량" },
  price:    { bg: "var(--negative-soft)",  color: "var(--negative)",     label: "가격" },
  shipment: { bg: "var(--positive-soft)",  color: "var(--positive)",     label: "출고량" },
  compare:  { bg: "#F0EBFF",                color: "#6B3FCB",             label: "비교" },
  cost:     { bg: "var(--warn-soft)",       color: "var(--warn)",         label: "원가" },
};

function ScheduleManagerModal({ onClose }) {
  const [list, setList] = useRM(DEMO_SCHEDULES);
  const toggle = (id) => setList(ls => ls.map(l => l.id === id ? { ...l, active: !l.active } : l));

  const activeCount = list.filter(l => l.active).length;

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal modal-schedule" onClick={e=>e.stopPropagation()}>
        <div className="share-head">
          <div className="share-head-ico" style={{background:"#F0EBFF", color:"#6B3FCB"}}>
            <Icon.gear style={{width:18, height:18}}/>
          </div>
          <div style={{flex:1}}>
            <h2 style={{fontSize:18}}>자동 보고서 예약</h2>
            <div className="lead" style={{marginTop:2}}>
              활성 <b style={{color:"var(--text-1)"}}>{activeCount}건</b> · 총 {list.length}건 등록됨
            </div>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="닫기">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        <div className="schedule-list">
          {list.map(s => {
            const chip = KIND_CHIP_LOCAL[s.kind];
            return (
              <div className={"schedule-row " + (!s.active ? "off" : "")} key={s.id}>
                <div className="schedule-row-main">
                  <div className="schedule-row-top">
                    <span className="chip" style={{background:chip.bg, color:chip.color}}>{chip.label}</span>
                    <span className="schedule-name">{s.name}</span>
                    {!s.active && <span className="chip" style={{background:"var(--surface-2)", color:"var(--text-3)"}}>일시정지</span>}
                  </div>
                  <div className="schedule-row-meta">
                    <span><b>{s.cadence}</b></span>
                    <span>·</span>
                    <span>다음 실행 <b className="mono">{s.next}</b></span>
                  </div>
                  <div className="schedule-row-recipients">
                    {s.recipients.map(r => (
                      <span className="schedule-pill" key={r}>{r}</span>
                    ))}
                    <span className="schedule-channels">
                      {s.channel.includes("email") && <span title="이메일">📧</span>}
                      {s.channel.includes("kakao") && <span title="카카오톡">💬</span>}
                    </span>
                  </div>
                </div>
                <div className="schedule-row-actions">
                  <button className={"switch " + (s.active?"on":"")} onClick={()=>toggle(s.id)}>
                    <span className="switch-thumb"></span>
                  </button>
                  <button className="btn sm">편집</button>
                </div>
              </div>
            );
          })}
        </div>

        <button className="schedule-add">
          <Icon.plus style={{width:14, height:14}}/>
          새 예약 추가
        </button>

        <div className="modal-actions">
          <button className="btn block" onClick={onClose}>닫기</button>
          <button className="btn primary block" onClick={onClose}>
            <Icon.check style={{width:14, height:14}}/>변경 사항 저장
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ReportPreviewModal — 보고서 행 미리보기 (풀스크린)
============================================================ */
function ReportPreviewModal({ report, onClose, onShare }) {
  const [page, setPage] = useRM(1);
  const totalPages = report?.kind === "cost" ? 9
    : report?.kind === "sales" ? 8
    : report?.kind === "compare" ? 7
    : report?.kind === "price" ? 6
    : 5;

  const prev = () => setPage(p => Math.max(1, p - 1));
  const next = () => setPage(p => Math.min(totalPages, p + 1));

  useRMEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!report) return null;
  const chip = KIND_CHIP_LOCAL[report.kind];

  return (
    <div className="preview-scrim" onClick={onClose}>
      <div className="preview-shell" onClick={e=>e.stopPropagation()}>
        {/* 좌측 메타 */}
        <aside className="preview-meta">
          <button className="preview-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            <span>닫기</span>
          </button>

          <span className="chip" style={{background:chip.bg, color:chip.color, alignSelf:"flex-start", marginTop:8}}>{chip.label}</span>
          <div className="preview-title">{report.name}</div>
          <div className="preview-id mono">{report.id}</div>

          <div className="preview-info">
            <div className="preview-info-row"><span>대상 기간</span><span className="mono">{report.period}</span></div>
            <div className="preview-info-row"><span>작성자</span><span>{report.author}</span></div>
            <div className="preview-info-row"><span>생성일시</span><span className="mono" style={{fontSize:11}}>{report.created}</span></div>
            <div className="preview-info-row"><span>크기</span><span>{report.size}</span></div>
            <div className="preview-info-row"><span>조회수</span><span><b>{report.views || 0}회</b></span></div>
          </div>

          <div className="preview-actions">
            <button className="btn primary block" onClick={()=>onShare(report)}>
              <Icon.upload style={{width:14, height:14}}/>공유 링크 발급
            </button>
            <button className="btn block">
              <Icon.download style={{width:14, height:14}}/>PDF 다운로드
            </button>
            <button className="btn block">
              <Icon.download style={{width:14, height:14}}/>Excel 다운로드
            </button>
          </div>

          <div className="preview-foot">
            <Icon.alert style={{width:12, height:12, color:"var(--text-4)"}}/>
            <span>보고서 데이터는 생성 시점으로 고정돼요.</span>
          </div>
        </aside>

        {/* 우측 paper */}
        <div className="preview-body">
          <div className="preview-pager">
            <button className="btn sm" onClick={prev} disabled={page === 1}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
              이전
            </button>
            <div className="preview-page-indicator">
              <span className="mono num"><b>{page}</b> / {totalPages}</span>
            </div>
            <button className="btn sm" onClick={next} disabled={page === totalPages}>
              다음
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </div>

          <div className="preview-paper-wrap">
            <div className="report-paper preview-paper">
              {page === 1 && <PreviewPageCover report={report} chip={chip}/>}
              {page > 1 && <PreviewPageStub page={page} totalPages={totalPages} report={report}/>}
            </div>
          </div>

          <div className="preview-pager-foot">
            <span className="muted" style={{fontSize:11}}>← / → 키로 이동 · Esc로 닫기</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPageCover({ report, chip }) {
  return (
    <>
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
        <h2 className="paper-title">{report.name}</h2>
        <div className="paper-meta">
          <span>대상 기간: {report.period}</span>
          <span>·</span>
          <span>{chip.label} 보고서</span>
          <span>·</span>
          <span className="mono">{report.created} · {report.author}</span>
        </div>
      </div>

      <div className="paper-stat-row" style={{gridTemplateColumns:"repeat(3, 1fr)"}}>
        <div className="paper-stat">
          <div className="paper-stat-label">대상 메뉴</div>
          <div className="paper-stat-val num">178<span className="unit">개</span></div>
          <div className="paper-stat-foot">전 카테고리</div>
        </div>
        <div className="paper-stat">
          <div className="paper-stat-label">평균 원가율</div>
          <div className="paper-stat-val num">31.4<span className="unit">%</span></div>
          <div className="paper-stat-foot positive">▼ 0.6%p 전월 대비</div>
        </div>
        <div className="paper-stat">
          <div className="paper-stat-label">위험 메뉴</div>
          <div className="paper-stat-val num" style={{color:"var(--warn)"}}>6<span className="unit">개</span></div>
          <div className="paper-stat-foot">35% 초과</div>
        </div>
      </div>

      <div className="paper-section">
        <div className="paper-section-title">목차</div>
        <table className="paper-table">
          <tbody>
            <tr><td style={{width:36}}>1</td><td>요약 · 핵심 변화</td><td className="num right muted">2쪽</td></tr>
            <tr><td>2</td><td>카테고리별 종합 비교</td><td className="num right muted">3쪽</td></tr>
            <tr><td>3</td><td>피자 종합 원가</td><td className="num right muted">4쪽</td></tr>
            <tr><td>4</td><td>1인피자 · 사이드</td><td className="num right muted">5~6쪽</td></tr>
            <tr><td>5</td><td>세트박스 · 엣지&amp;도우</td><td className="num right muted">7쪽</td></tr>
            <tr><td>6</td><td>위험 메뉴 부록</td><td className="num right muted">8쪽</td></tr>
            <tr><td>7</td><td>단가 출처 / 변경 이력</td><td className="num right muted">9쪽</td></tr>
          </tbody>
        </table>
      </div>

      <div className="paper-foot">
        <span>표지 / 1</span>
        <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
      </div>
    </>
  );
}

function PreviewPageStub({ page, totalPages, report }) {
  return (
    <>
      <div className="paper-head" style={{marginBottom: 16}}>
        <div className="paper-eyebrow">{report.name}</div>
        <h2 className="paper-title" style={{fontSize:18}}>본문 {page-1}장</h2>
      </div>
      <div className="paper-stub">
        <div className="paper-stub-ico">
          <Icon.doc style={{width:32, height:32, color:"var(--text-4)"}}/>
        </div>
        <div className="paper-stub-text">
          이 페이지의 실제 내용은 보고서 생성 시점에 자동으로 채워져요.
        </div>
        <div className="paper-stub-hint">
          미리보기는 첫 페이지(표지)만 실제 콘텐츠를 보여드려요.
        </div>
      </div>
      <div className="paper-foot">
        <span>{page} / {totalPages}</span>
        <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
      </div>
    </>
  );
}

Object.assign(window.Pages, {
  ShareLinkModal,
  ScheduleManagerModal,
  ReportPreviewModal,
});
