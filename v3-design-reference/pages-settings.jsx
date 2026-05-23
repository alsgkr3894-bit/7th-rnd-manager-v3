/* global React, Icon, Pages, fmtKRW, showToast */
const { useState: useSet } = React;
const { PageHeader } = window.Pages;

/* ============================================================
   공통 — 설정 그룹 / 행 헬퍼
============================================================ */
function SettingsGroup({ title, sub, children }) {
  return (
    <div className="card setting-card">
      <div className="section-h">{title}</div>
      {sub && <div className="setting-section-sub">{sub}</div>}
      {children}
    </div>
  );
}
function SettingsRow({ name, desc, control }) {
  return (
    <div className="setting-row">
      <div className="setting-meta">
        <div className="setting-name">{name}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      <div className="setting-control">{control}</div>
    </div>
  );
}
function Toggle({ value, onChange }) {
  return (
    <button className={"switch " + (value ? "on" : "")} onClick={()=>onChange(!value)}>
      <span className="switch-thumb"></span>
    </button>
  );
}

/* ============================================================
   Page: 데이터 백업
============================================================ */
function SettingsBackupPage() {
  const [autoBackup, setAutoBackup] = useSet(true);
  const [freq, setFreq] = useSet("daily");
  const [include, setInclude] = useSet({
    sales: true,
    jette: true,
    cost: true,
    notes: true,
    nutrition: false,
  });
  const upd = (k, v) => setInclude(s => ({ ...s, [k]: v }));

  const backups = [
    { id: "BK-2026-052", date: "2026.05.22 03:00", kind: "자동",   size: "184 MB", scope: "전체", status: "성공" },
    { id: "BK-2026-051", date: "2026.05.21 03:00", kind: "자동",   size: "183 MB", scope: "전체", status: "성공" },
    { id: "BK-2026-050", date: "2026.05.20 17:42", kind: "수동",   size: "183 MB", scope: "전체", status: "성공" },
    { id: "BK-2026-049", date: "2026.05.20 03:00", kind: "자동",   size: "182 MB", scope: "전체", status: "성공" },
    { id: "BK-2026-048", date: "2026.05.19 03:00", kind: "자동",   size: "182 MB", scope: "전체", status: "성공" },
    { id: "BK-2026-047", date: "2026.05.18 03:00", kind: "자동",   size: "181 MB", scope: "전체", status: "성공" },
    { id: "BK-2026-046", date: "2026.05.17 03:00", kind: "자동",   size: "—",      scope: "—",    status: "실패" },
    { id: "BK-2026-045", date: "2026.05.16 03:00", kind: "자동",   size: "180 MB", scope: "전체", status: "성공" },
  ];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "데이터 백업"]}
        title="데이터 백업"
        sub="모든 데이터를 안전하게 보관해요. 자동 백업은 매일 새벽 3시에 실행돼요."
        actions={<>
          <button className="btn"><Icon.gear style={{width:14, height:14}}/>S3 연결 설정</button>
          <button className="btn primary" onClick={()=>showToast("백업 완료 — S3에 저장됐어요 (184 MB)", "ok")}><Icon.upload style={{width:14, height:14}}/>지금 백업 실행</button>
        </>}
      />

      {/* 요약 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">마지막 백업</div>
          <div className="stat-value" style={{fontSize:18}}>오늘 03:00</div>
          <div className="stat-foot positive">✓ 성공 · 184 MB</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">다음 자동 백업</div>
          <div className="stat-value" style={{fontSize:18}}>내일 03:00</div>
          <div className="stat-foot">남은 시간 약 13시간</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">보관된 백업</div>
          <div className="stat-value num">52<span className="unit">건</span></div>
          <div className="stat-foot">최근 60일 · 총 9.4 GB</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">저장 위치</div>
          <div className="stat-value" style={{fontSize:16, lineHeight:1.3}}>AWS S3 (Seoul)</div>
          <div className="stat-foot mono" style={{fontSize:11}}>s3://7th-rnd-backup/</div>
        </div>
      </div>

      {/* 자동 백업 설정 */}
      <SettingsGroup title="자동 백업 정책">
        <SettingsRow
          name="자동 백업 사용"
          desc="매일 정해진 시간에 데이터를 백업해요. 수동 백업은 별도로 가능합니다."
          control={<Toggle value={autoBackup} onChange={setAutoBackup}/>}
        />
        <SettingsRow
          name="실행 주기"
          desc="자동 백업을 얼마나 자주 실행할지 선택하세요."
          control={
            <div className="seg-row">
              {[
                {value:"daily",  label:"매일"},
                {value:"weekly", label:"매주"},
                {value:"manual", label:"수동만"},
              ].map(o => (
                <button key={o.value}
                  className={"seg-pill " + (freq === o.value ? "active" : "")}
                  onClick={()=>setFreq(o.value)}>{o.label}</button>
              ))}
            </div>
          }
        />
        <SettingsRow
          name="실행 시간"
          desc="자동 백업이 실행되는 시각 (KST 기준)."
          control={
            <select className="period-select num" defaultValue="03">
              {["00","01","02","03","04","05","06"].map(h => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
          }
        />
        <SettingsRow
          name="보관 기간"
          desc="이 기간이 지난 백업은 자동으로 삭제돼요."
          control={
            <select className="period-select num" defaultValue="60">
              <option value="30">30일</option>
              <option value="60">60일</option>
              <option value="90">90일</option>
              <option value="180">180일</option>
            </select>
          }
        />
      </SettingsGroup>

      {/* 백업 범위 */}
      <SettingsGroup title="백업 범위" sub="자동 백업에 포함할 데이터를 선택하세요. 수동 백업은 항상 전체를 포함합니다.">
        <SettingsRow name="메뉴 판매량"     desc="업로드 원본 + 매칭 결과 + 집계 캐시"  control={<Toggle value={include.sales}     onChange={v=>upd("sales",v)}/>}/>
        <SettingsRow name="제때 상품 데이터" desc="가격 이력 + 출고량 + 대상 제품 목록"  control={<Toggle value={include.jette}     onChange={v=>upd("jette",v)}/>}/>
        <SettingsRow name="원가표 / 식자재"   desc="피자·사이드·세트박스·엣지&도우·단가" control={<Toggle value={include.cost}      onChange={v=>upd("cost",v)}/>}/>
        <SettingsRow name="메뉴개발노트"     desc="테스트 기록 + 보고용 요약 텍스트"     control={<Toggle value={include.notes}     onChange={v=>upd("notes",v)}/>}/>
        <SettingsRow name="영양성분 / 알레르기" desc="메뉴별 영양정보 + 알레르기 매칭 표"  control={<Toggle value={include.nutrition} onChange={v=>upd("nutrition",v)}/>}/>
      </SettingsGroup>

      {/* 최근 백업 이력 */}
      <div className="card mng-card">
        <div className="mng-head">
          <div>
            <div className="card-title">최근 백업 이력</div>
            <div className="card-sub">최근 8건 · 전체 52건</div>
          </div>
          <button className="btn sm"><Icon.download style={{width:12, height:12}}/>이력 CSV</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:130}}>백업 ID</th>
              <th style={{width:160}}>일시</th>
              <th style={{width:90}}>유형</th>
              <th>범위</th>
              <th style={{width:90, textAlign:"right"}}>크기</th>
              <th style={{width:100}}>상태</th>
              <th style={{width:200}}></th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id}>
                <td className="muted mono">{b.id}</td>
                <td className="mono" style={{fontSize:12}}>{b.date}</td>
                <td>
                  <span className="chip" style={{
                    background: b.kind === "자동" ? "var(--accent-soft)" : "var(--surface-2)",
                    color: b.kind === "자동" ? "var(--accent-text)" : "var(--text-2)",
                  }}>{b.kind}</span>
                </td>
                <td>{b.scope}</td>
                <td className="num right">{b.size}</td>
                <td>
                  {b.status === "성공" ? (
                    <span className="chip" style={{background:"var(--positive-soft)", color:"var(--positive)"}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:"var(--positive)",display:"inline-block"}}></span>
                      성공
                    </span>
                  ) : (
                    <span className="chip" style={{background:"var(--negative-soft)", color:"var(--negative)"}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:"var(--negative)",display:"inline-block"}}></span>
                      실패
                    </span>
                  )}
                </td>
                <td>
                  <div style={{display:"flex", gap:6, justifyContent:"flex-end"}}>
                    <button className="btn sm" disabled={b.status !== "성공"} onClick={()=>b.status==="성공"&&showToast(`${b.id} 다운로드 완료`, "ok")}>
                      <Icon.download style={{width:12, height:12}}/>다운로드
                    </button>
                    <button className="btn sm" disabled={b.status !== "성공"} onClick={()=>b.status==="성공"&&showToast(`${b.id} 복원 요청됨 — 확인 단계로 이동해요`, "info")}>복원</button>
                    <button className="btn sm ghost"><Icon.more style={{width:14, height:14}}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card warn-card">
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">백업 파일은 AES-256으로 암호화돼요</div>
          <div className="warn-text">
            S3 버킷의 SSE-KMS 키를 사용해 저장돼요. 백업 파일을 직접 열려면 시스템 관리자에게 복호화 키를 요청하세요. (CLAUDE.md 정책)
          </div>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   Page: 데이터 복원
============================================================ */
function SettingsRestorePage() {
  const [picked, setPicked] = useSet("BK-2026-051");
  const [mode, setMode]     = useSet("preview");
  const [scope, setScope]   = useSet({
    sales: true, jette: true, cost: true, notes: false, nutrition: false,
  });
  const upd = (k, v) => setScope(s => ({ ...s, [k]: v }));

  const backups = [
    { id: "BK-2026-052", date: "2026.05.22 03:00", scope: "전체", size: "184 MB", rec: true,  desc: "최신 · 자동 백업" },
    { id: "BK-2026-051", date: "2026.05.21 03:00", scope: "전체", size: "183 MB", rec: false, desc: "단가 업데이트 직전" },
    { id: "BK-2026-050", date: "2026.05.20 17:42", scope: "전체", size: "183 MB", rec: false, desc: "수동 백업 — 보고서 생성 전" },
    { id: "BK-2026-049", date: "2026.05.20 03:00", scope: "전체", size: "182 MB", rec: false, desc: "자동" },
    { id: "BK-2026-048", date: "2026.05.19 03:00", scope: "전체", size: "182 MB", rec: false, desc: "자동" },
  ];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "데이터 복원"]}
        title="데이터 복원"
        sub="백업 시점으로 데이터를 되돌려요. 복원은 되돌릴 수 없으니 신중히 진행하세요."
      />

      <div className="info-banner info-accent" style={{background:"var(--negative-soft)", borderColor:"color-mix(in oklab, var(--negative) 22%, transparent)"}}>
        <div className="info-banner-ico" style={{background:"var(--negative-soft)", color:"var(--negative)"}}>
          <Icon.alert style={{width:16, height:16}}/>
        </div>
        <div>
          <b>복원은 즉시 반영되지 않아요.</b> 백업 선택 → 미리보기 확인 → "확정 복원" 단계를 거쳐요. 복원 직전 시점의 자동 백업이 한 번 더 생성됩니다.
        </div>
      </div>

      <div className="restore-grid">
        {/* 좌: 백업 선택 */}
        <div className="card">
          <div className="card-header" style={{marginBottom: 10}}>
            <div>
              <div className="card-title">복원할 백업 선택</div>
              <div className="card-sub">최근 5건 · 더 이전 백업은 검색해주세요</div>
            </div>
            <div className="filter-search" style={{width: 200}}>
              <Icon.search style={{width:14, height:14, color:"var(--text-3)"}}/>
              <input placeholder="백업 ID·날짜 검색" />
            </div>
          </div>
          <div className="backup-list">
            {backups.map(b => (
              <label key={b.id}
                className={"backup-row " + (picked === b.id ? "active" : "")}
                onClick={()=>setPicked(b.id)}>
                <input type="radio" name="bk" checked={picked === b.id} onChange={()=>{}} />
                <div className="backup-radio"><span></span></div>
                <div className="backup-info">
                  <div className="backup-info-top">
                    <span className="mono muted" style={{fontSize:12}}>{b.id}</span>
                    {b.rec && <span className="chip" style={{background:"var(--accent-soft)", color:"var(--accent-text)"}}>추천</span>}
                  </div>
                  <div className="backup-info-name">{b.date}</div>
                  <div className="backup-info-desc">{b.desc}</div>
                </div>
                <div className="backup-info-meta">
                  <div className="num" style={{fontWeight:700}}>{b.size}</div>
                  <div className="muted" style={{fontSize:11}}>{b.scope}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 우: 복원 옵션 */}
        <div className="card">
          <div className="section-h">복원 옵션</div>

          <div className="opt-group">
            <div className="opt-label">복원 범위</div>
            <div className="opt-hint">선택한 항목만 백업 시점으로 되돌려요. 나머지는 현재 상태를 유지해요.</div>
            <div className="opt-body" style={{marginTop: 8}}>
              {[
                {k:"sales",     label:"메뉴 판매량"},
                {k:"jette",     label:"제때 상품 데이터"},
                {k:"cost",      label:"원가표 / 식자재"},
                {k:"notes",     label:"메뉴개발노트"},
                {k:"nutrition", label:"영양성분 / 알레르기"},
              ].map(o => (
                <label key={o.k} className="opt-check">
                  <input type="checkbox" checked={scope[o.k]} onChange={e=>upd(o.k, e.target.checked)}/>
                  <span className="opt-check-box"><Icon.check style={{width:12, height:12}}/></span>
                  <div className="opt-check-label">{o.label}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="opt-group">
            <div className="opt-label">실행 모드</div>
            <div className="seg-row">
              <button className={"seg-pill " + (mode==="preview"?"active":"")} onClick={()=>setMode("preview")}>미리보기 (차이만 표시)</button>
              <button className={"seg-pill " + (mode==="apply"?"active":"")}   onClick={()=>setMode("apply")}>실제 복원</button>
            </div>
          </div>

          {/* 영향 요약 */}
          <div className="restore-impact">
            <div className="restore-impact-h">예상 변경 사항</div>
            <div className="restore-impact-row">
              <div>판매량 데이터</div>
              <div><b className="num" style={{color:"var(--negative)"}}>−2,840</b>건 · <span className="muted">5/21~5/22 신규 매칭 손실</span></div>
            </div>
            <div className="restore-impact-row">
              <div>제때 단가</div>
              <div><b className="num" style={{color:"var(--accent-text)"}}>5</b>개 품목 이전 단가로 환원</div>
            </div>
            <div className="restore-impact-row">
              <div>원가표</div>
              <div><span className="muted">자동 재계산 예정 — 약 12초 소요</span></div>
            </div>
            <div className="restore-impact-row">
              <div>메뉴개발노트</div>
              <div><span className="muted">제외 — 현재 상태 유지</span></div>
            </div>
          </div>

          <div style={{display:"flex", gap:8, marginTop:16}}>
            <button className="btn block">취소</button>
            <button className="btn primary block" style={{background: mode==="apply" ? "var(--negative)" : undefined, borderColor: mode==="apply" ? "var(--negative)" : undefined}} onClick={()=>showToast(mode==="apply" ? "복원 완료 — 직전 상태로 되돌렸어요" : "미리보기 생성 완료", mode==="apply" ? "ok" : "info")}>
              {mode === "apply" ? <><Icon.alert style={{width:14, height:14}}/>확정 복원 실행</> : <>미리보기 생성</>}
            </button>
          </div>
        </div>
      </div>

      <div className="card warn-card">
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">복원 직전 자동 백업</div>
          <div className="warn-text">
            "확정 복원"을 누르면 현재 시점의 자동 백업이 먼저 생성된 뒤 복원이 실행돼요. 잘못 복원했더라도 직전 상태로 되돌릴 수 있어요. (CLAUDE.md 정책)
          </div>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   Page: 시스템 설정
============================================================ */
function SettingsSystemPage() {
  const [lang, setLang] = useSet("ko");
  const [tz, setTz]     = useSet("Asia/Seoul");
  const [currency, setCurrency] = useSet("KRW");
  const [autoRecalc, setAutoRecalc] = useSet(true);
  const [strictPosting, setStrictPosting] = useSet(true);
  const [round, setRound] = useSet("round");
  const [unmatchedAlert, setUnmatchedAlert] = useSet(true);
  const [costAlert, setCostAlert] = useSet(true);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "시스템 설정"]}
        title="시스템 설정"
        sub="플랫폼 전체에 적용되는 정책을 관리해요. 변경 사항은 즉시 반영됩니다."
      />

      <SettingsGroup title="지역 / 언어">
        <SettingsRow
          name="언어"
          desc="UI 텍스트 표시 언어"
          control={
            <select className="period-select" value={lang} onChange={e=>setLang(e.target.value)}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          }
        />
        <SettingsRow
          name="시간대"
          desc="모든 일시 표시·자동 작업의 기준 시간대"
          control={
            <select className="period-select" value={tz} onChange={e=>setTz(e.target.value)}>
              <option value="Asia/Seoul">Asia/Seoul (KST · UTC+9)</option>
              <option value="UTC">UTC</option>
            </select>
          }
        />
        <SettingsRow
          name="통화"
          desc="원가·판매가·매출 표시 통화"
          control={
            <select className="period-select" value={currency} onChange={e=>setCurrency(e.target.value)}>
              <option value="KRW">원 (KRW)</option>
              <option value="USD">달러 (USD)</option>
            </select>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="원가 계산 정책">
        <SettingsRow
          name="단가 업데이트 시 원가표 자동 재계산"
          desc="제때 단가가 변경되면 모든 원가표를 자동으로 다시 계산해요."
          control={<Toggle value={autoRecalc} onChange={setAutoRecalc}/>}
        />
        <SettingsRow
          name="미연동 재료 차단"
          desc="제때 원가표에 등록되지 않은 재료가 포함된 메뉴는 원가표 발행을 차단해요."
          control={<Toggle value={strictPosting} onChange={setStrictPosting}/>}
        />
        <SettingsRow
          name="원가 반올림 방식"
          desc="g·개당 단가에서 원 단위 환산 시 적용"
          control={
            <div className="seg-row">
              {[
                {value:"round", label:"반올림"},
                {value:"ceil",  label:"올림"},
                {value:"floor", label:"내림"},
              ].map(o => (
                <button key={o.value}
                  className={"seg-pill " + (round === o.value ? "active" : "")}
                  onClick={()=>setRound(o.value)}>{o.label}</button>
              ))}
            </div>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="알림">
        <SettingsRow
          name="미매칭 메뉴 알림"
          desc="판매량 업로드 후 매칭되지 않은 메뉴가 있으면 홈에 알림"
          control={<Toggle value={unmatchedAlert} onChange={setUnmatchedAlert}/>}
        />
        <SettingsRow
          name="원가율 35% 초과 알림"
          desc="재계산 후 35% 초과 메뉴가 새로 생기면 빨간 알림"
          control={<Toggle value={costAlert} onChange={setCostAlert}/>}
        />
      </SettingsGroup>

      <SettingsGroup title="개발자 / 통합">
        <SettingsRow
          name="API 키"
          desc="외부 시스템(POS·물류)에서 데이터를 받아올 때 사용"
          control={
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <code className="mono" style={{fontSize:12, padding:"6px 10px", background:"var(--surface-2)", borderRadius:8, border:"1px solid var(--border)"}}>
                sk_live_••••••••••••a4f2
              </code>
              <button className="btn sm">재발급</button>
            </div>
          }
        />
        <SettingsRow
          name="Webhook 엔드포인트"
          desc="단가·판매량 업데이트 이벤트를 받을 URL"
          control={
            <input className="input" style={{width: 280}} defaultValue="https://hooks.7thpizza.co.kr/wonpay/events"/>
          }
        />
        <SettingsRow
          name="감사 로그 보관"
          desc="모든 변경 이력을 누가·언제·무엇을 기록"
          control={
            <select className="period-select" defaultValue="90">
              <option value="30">30일</option>
              <option value="90">90일</option>
              <option value="365">1년</option>
              <option value="forever">영구</option>
            </select>
          }
        />
      </SettingsGroup>

      <div className="card warn-card">
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">변경 사항은 즉시 적용돼요</div>
          <div className="warn-text">
            저장 버튼은 따로 없어요 — 토글·드롭다운을 바꾸는 즉시 반영돼요. 실수 방지가 필요한 항목은 별도 확인 단계가 있어요.
          </div>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   Page: 계정 관리
============================================================ */
function SettingsAccountPage() {
  const me = {
    name: "민혁 책임",
    team: "R&D팀",
    email: "minhyuk@7thpizza.co.kr",
    role: "관리자",
    initial: "민",
  };
  const members = [
    { name: "민혁 책임",     role: "관리자",   team: "R&D팀",     email: "minhyuk@7thpizza.co.kr", last: "방금 전",        initial: "민", you: true },
    { name: "지영 매니저",    role: "에디터",   team: "R&D팀",     email: "jiyoung@7thpizza.co.kr", last: "32분 전",        initial: "지" },
    { name: "상무 김재혁",    role: "조회자",   team: "경영지원",   email: "jh.kim@7thpizza.co.kr",  last: "어제 18:42",      initial: "김" },
    { name: "실장 박서연",    role: "에디터",   team: "운영팀",     email: "sypark@7thpizza.co.kr",  last: "2일 전",          initial: "박" },
    { name: "POS 자동계정",   role: "API",      team: "시스템",     email: "pos-bot@system.local",   last: "5분 전",          initial: "P" },
    { name: "외주 컨설턴트",   role: "조회자",   team: "외부",       email: "consultant@hello.kr",    last: "30일 전 · 만료", initial: "외", expired: true },
  ];

  const roleColor = {
    "관리자":   { bg:"var(--accent-soft)",   color:"var(--accent-text)" },
    "에디터":   { bg:"var(--positive-soft)", color:"var(--positive)" },
    "조회자":   { bg:"var(--surface-2)",     color:"var(--text-2)" },
    "API":      { bg:"#F0EBFF",              color:"#6B3FCB" },
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "계정 관리"]}
        title="계정 관리"
        sub="구성원의 역할과 접근 권한을 관리해요."
        actions={<button className="btn primary"><Icon.plus style={{width:14, height:14}}/>구성원 초대</button>}
      />

      {/* 내 프로필 */}
      <div className="card profile-card">
        <div className="profile-card-avatar">{me.initial}</div>
        <div style={{flex:1}}>
          <div className="profile-card-name">{me.name}</div>
          <div className="profile-card-meta">
            <span>{me.team}</span>
            <span className="muted">·</span>
            <span className="mono">{me.email}</span>
            <span className="chip" style={{background:"var(--accent-soft)", color:"var(--accent-text)", marginLeft:6}}>{me.role}</span>
          </div>
          <div className="profile-card-actions">
            <button className="btn sm">프로필 수정</button>
            <button className="btn sm">비밀번호 변경</button>
            <button className="btn sm">2단계 인증 설정</button>
          </div>
        </div>
        <div className="profile-card-side">
          <div className="profile-side-label">마지막 로그인</div>
          <div className="profile-side-val">2026.05.22 09:14</div>
          <div className="profile-side-label" style={{marginTop:10}}>접속 IP</div>
          <div className="profile-side-val mono">211.45.122.18</div>
        </div>
      </div>

      {/* 권한 매트릭스 (간단 요약) */}
      <div className="card cat-overview">
        <div className="card-header" style={{marginBottom: 14}}>
          <div>
            <div className="card-title">역할별 권한</div>
            <div className="card-sub">관리자가 직접 변경할 수 있어요 — 클릭으로 토글</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width: 180}}>권한</th>
              <th style={{textAlign:"center", width: 110}}>관리자</th>
              <th style={{textAlign:"center", width: 110}}>에디터</th>
              <th style={{textAlign:"center", width: 110}}>조회자</th>
              <th style={{textAlign:"center", width: 110}}>API</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "판매량 업로드",         r: ["✓","✓","",  "✓"] },
              { name: "단가 업로드 · 수정",      r: ["✓","✓","",  ""]  },
              { name: "원가표 · 메뉴 편집",      r: ["✓","✓","",  ""]  },
              { name: "보고서 생성",           r: ["✓","✓","",  ""]  },
              { name: "보고서 조회",           r: ["✓","✓","✓", "✓"] },
              { name: "메뉴개발노트 작성",      r: ["✓","✓","",  ""]  },
              { name: "백업 · 복원 실행",       r: ["✓","",  "",  ""]  },
              { name: "구성원 관리",           r: ["✓","",  "",  ""]  },
            ].map(row => (
              <tr key={row.name}>
                <td style={{fontWeight: 700}}>{row.name}</td>
                {row.r.map((v, i) => (
                  <td key={i} style={{textAlign:"center"}}>
                    {v ? (
                      <span style={{
                        display:"inline-flex", width:24, height:24, borderRadius:6,
                        background:"var(--positive-soft)", color:"var(--positive)",
                        alignItems:"center", justifyContent:"center", fontWeight:800,
                      }}>{v}</span>
                    ) : <span className="muted">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 구성원 목록 */}
      <div className="card mng-card">
        <div className="mng-head">
          <div>
            <div className="card-title">구성원 목록</div>
            <div className="card-sub">활성 {members.filter(m=>!m.expired).length}명 · 만료 {members.filter(m=>m.expired).length}명</div>
          </div>
          <div className="filter-search" style={{width: 240}}>
            <Icon.search style={{width:14, height:14, color:"var(--text-3)"}}/>
            <input placeholder="이름·이메일·팀 검색" />
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>이름</th>
              <th style={{width: 100}}>역할</th>
              <th style={{width: 120}}>팀</th>
              <th>이메일</th>
              <th style={{width: 130}}>마지막 활동</th>
              <th style={{width: 200}}></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const rc = roleColor[m.role] || roleColor["조회자"];
              return (
                <tr key={m.email} style={{opacity: m.expired ? 0.55 : 1}}>
                  <td>
                    <div style={{display:"flex", alignItems:"center", gap:10}}>
                      <span style={{
                        width: 32, height: 32, borderRadius:"50%",
                        background: m.expired ? "var(--surface-2)" : "var(--accent)",
                        color: m.expired ? "var(--text-3)" : "#fff",
                        display:"inline-flex", alignItems:"center", justifyContent:"center",
                        fontWeight: 800, fontSize: 12,
                      }}>{m.initial}</span>
                      <div>
                        <div style={{fontWeight: 700}}>
                          {m.name}
                          {m.you && <span className="chip" style={{marginLeft:6, background:"var(--surface-2)", color:"var(--text-2)", fontSize:10}}>나</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><span className="chip" style={{background: rc.bg, color: rc.color}}>{m.role}</span></td>
                  <td>{m.team}</td>
                  <td className="mono" style={{fontSize: 12, color:"var(--text-2)"}}>{m.email}</td>
                  <td className="muted" style={{fontSize: 12}}>{m.last}</td>
                  <td>
                    <div style={{display:"flex", gap:6, justifyContent:"flex-end"}}>
                      <button className="btn sm" disabled={m.you}>역할 변경</button>
                      <button className="btn sm" disabled={m.you}>재발급</button>
                      <button className="btn sm ghost"><Icon.more style={{width:14, height:14}}/></button>
                    </div>
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
          <div className="warn-title">관리자 권한은 최소 2명 이상 권장</div>
          <div className="warn-text">
            단일 관리자가 비활성화되면 백업·복원·구성원 관리가 불가능해져요. 부책임자 1명에게 관리자 권한을 부여해두세요.
          </div>
        </div>
      </div>
    </main>
  );
}

Object.assign(window.Pages, {
  SettingsBackupPage,
  SettingsRestorePage,
  SettingsSystemPage,
  SettingsAccountPage,
});
