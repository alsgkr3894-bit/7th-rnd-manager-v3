'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { ShareLinkModal, ScheduleManagerModal, ReportPreviewModal } from '@/components/report/ReportModals';

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

const REPORT_HISTORY = [];

const KIND_CHIP = {
  sales:    { bg: "var(--accent-soft)",    color: "var(--accent-text)",  label: "판매량" },
  price:    { bg: "var(--negative-soft)",  color: "var(--negative)",     label: "가격" },
  shipment: { bg: "var(--positive-soft)",  color: "var(--positive)",     label: "출고량" },
  compare:  { bg: "#F0EBFF",                color: "#6B3FCB",             label: "비교" },
  cost:     { bg: "var(--warn-soft)",       color: "var(--warn)",         label: "원가" },
};

export default function Page() {
  const router = useRouter();
  const [kindFilter, setKindFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [favSet, setFavSet] = useState(() => new Set(REPORT_HISTORY.filter(r=>r.fav).map(r=>r.id)));
  const [shareTarget, setShareTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

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
    auto: 0,
    sharedLinks: 0,
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
          <button className="btn primary" onClick={()=>showToast("보고서 생성 페이지로 이동해요", "info")}><Icon.plus style={{width:14, height:14}}/>새 보고서 생성</button>
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
          <div className="stat-foot">활성 링크 없음</div>
        </div>
      </div>

      {/* 5종 보고서 카드 */}
      <div className="report-kind-grid report-kind-grid-5">
        {Object.values(REPORT_KINDS).map(k => {
          const IconEl = Icon[k.icon] || Icon.doc;
          const href = k.id === "compare" ? "/report/menu-sales-compare" : `/report/${k.id}`;
          return (
            <button key={k.id} className="report-kind-card" onClick={() => router.push(href)}>
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
        <div style={{overflowX:'auto'}}>
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
      </div>

      <div className="card warn-card" style={{marginTop: 0}}>
        <div className="warn-ico"><Icon.alert style={{width:16,height:16}}/></div>
        <div>
          <div className="warn-title">보고서는 생성 시점의 데이터로 고정돼요</div>
          <div className="warn-text">
            제때 단가나 판매량이 이후 수정되어도 기존 보고서는 그대로 보관돼요. 다시 만들고 싶으면 <b>새 보고서 생성</b>을 눌러주세요.
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {shareTarget   && <ShareLinkModal report={shareTarget} onClose={()=>setShareTarget(null)}/>}
      {scheduleOpen  && <ScheduleManagerModal onClose={()=>setScheduleOpen(false)}/>}
      {previewTarget && (
        <ReportPreviewModal
          report={previewTarget}
          onClose={()=>setPreviewTarget(null)}
          onShare={(r)=>{ setPreviewTarget(null); setShareTarget(r); }}
        />
      )}
    </main>
  );
}
