'use client';
import { useRef, useLayoutEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { KIND_CHIP } from '@/lib/report/constants';
import { pad } from '@/lib/format';

export { KIND_CHIP };

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
  const rowRef = useRef(null);
  const [ind, setInd] = useState(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const active = row.querySelector('.seg-pill.active');
    if (!active) { setInd(null); return; }
    setInd({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value]);

  return (
    <div className={'seg-row' + (ind ? ' has-indicator' : '')} ref={rowRef} role="group">
      {ind && (
        <span className="seg-indicator" style={{ left: ind.left, width: ind.width }} />
      )}
      {options.map(o => (
        <button
          key={o.value ?? o}
          role="radio"
          aria-checked={value === (o.value ?? o)}
          className={'seg-pill ' + (value === (o.value ?? o) ? 'active' : '')}
          onClick={() => onChange(o.value ?? o)}
        >
          {o.label ?? o}
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

function makeReportTitle(reportMeta) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rawPeriod = reportMeta?.period || '';
  const periodPart = rawPeriod.replace(/(\d+)년 (\d+)월/, (_, y, m) => `${y}년${m.padStart(2, '0')}월`);
  const rawName = reportMeta?.name || '보고서';
  const namePart = rawName.replace(rawPeriod, '').trim().replace(/\s+/g, '');
  return `7번가피자_${periodPart} ${namePart}_${dateStr}`;
}

function triggerPrint(reportMeta) {
  const preview = document.querySelector('.report-paper');
  if (!preview) return;

  const title = makeReportTitle(reportMeta);
  const prevTitle = document.title;
  document.title = title;

  const printRoot = document.createElement('div');
  printRoot.id = '__report-print-root';
  printRoot.appendChild(preview.cloneNode(true));
  document.body.appendChild(printRoot);

  const style = document.createElement('style');
  style.textContent = `
    @media print {
      @page { margin: 16mm; size: A4 portrait; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body > *:not(#__report-print-root) { display: none !important; }
      #__report-print-root {
        display: block !important;
        background: #fff !important;
      }
      #__report-print-root .report-paper {
        box-shadow: none !important;
        min-height: unset !important;
        border-radius: 0 !important;
        border: none !important;
      }
      #__report-print-root .report-paper::before { display: none !important; }
      .paper-cat-section + .paper-cat-section { break-before: page; }
    }
  `;
  document.head.appendChild(style);

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    document.title = prevTitle;
    printRoot.remove();
    style.remove();
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, 5000);
}

export default function ReportBuilderShell({
  breadcrumb, title, sub, kind, options, preview, exportNote,
  reportMeta = {}, dataError, isLoading = false,
  docFormat = { pdf: true, excel: false }, onExcelExport,
}) {
  const handleGenerate = () => {
    if (!docFormat.pdf && !docFormat.excel) {
      showToast('문서 형식을 하나 이상 선택해 주세요', 'error');
      return;
    }
    if (docFormat.pdf) triggerPrint(reportMeta);
    if (docFormat.excel && onExcelExport) onExcelExport();
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        sub={sub}
        actions={<>
          <button className="btn primary" onClick={handleGenerate}>
            <Icon.download style={{width:14, height:14}}/>보고서 생성
          </button>
        </>}
      />

      <div className="report-builder">
        <aside className="report-options card">
          <div className="section-h">보고서 옵션</div>
          {options}
        </aside>

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

          {isLoading ? (
            <div className="report-loading">
              <div className="report-loading-spinner"/>
              <span style={{fontSize:13, color:'var(--text-3)'}}>데이터 불러오는 중…</span>
            </div>
          ) : dataError ? (
            <div className="report-empty-banner">
              <Icon.alert style={{width:18, height:18, flexShrink:0, color:'var(--warn)'}}/>
              <div>
                <div style={{fontWeight:600, marginBottom:3}}>데이터를 불러올 수 없어요</div>
                <div style={{fontSize:12, color:'var(--text-3)'}}>{dataError}</div>
              </div>
            </div>
          ) : (
            <div className="report-paper">{preview}</div>
          )}

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
