'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export const KIND_CHIP = {
  sales:    { bg: 'var(--accent-soft)',    color: 'var(--accent-text)',  label: '판매량' },
  price:    { bg: 'var(--negative-soft)',  color: 'var(--negative)',     label: '가격' },
  shipment: { bg: 'var(--positive-soft)',  color: 'var(--positive)',     label: '출고량' },
  compare:  { bg: '#F0EBFF',                color: '#6B3FCB',             label: '비교' },
  cost:     { bg: 'var(--warn-soft)',       color: 'var(--warn)',         label: '원가' },
};

export function OptGroup({ label, children, hint }) {
  return (
    <div className="opt-group">
      <div className="opt-label">{label}</div>
      {hint && <div className="opt-hint">{hint}</div>}
      <div className="opt-body">{children}</div>
    </div>
  );
}

export function Seg({ value, onChange, options }) {
  return (
    <div className="seg-row">
      {options.map(o => (
        <button
          key={o.value || o}
          className={"seg-pill " + (value === (o.value || o) ? "active" : "")}
          onClick={() => onChange(o.value || o)}
        >
          {o.label || o}
        </button>
      ))}
    </div>
  );
}

export function Check({ label, value, onChange, hint }) {
  return (
    <label className="opt-check">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <span className="opt-check-box"><Icon.check style={{width:12, height:12}}/></span>
      <div>
        <div className="opt-check-label">{label}</div>
        {hint && <div className="opt-check-hint">{hint}</div>}
      </div>
    </label>
  );
}

export default function ReportBuilderShell({ breadcrumb, title, sub, kind, options, preview, exportNote }) {
  return (
    <main className="main">
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        sub={sub}
        actions={<>
          <button className="btn" onClick={()=>showToast("임시 저장됐어요", "ok")}>
            <Icon.doc style={{width:14, height:14}}/>임시 저장
          </button>
          <button className="btn primary" onClick={()=>showToast("보고서 생성 완료 — 다운로드 준비됐어요", "ok")}>
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
              <span className="chip" style={{background: KIND_CHIP[kind].bg, color: KIND_CHIP[kind].color}}>
                {KIND_CHIP[kind].label}
              </span>
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
