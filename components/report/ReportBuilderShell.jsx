'use client';
import { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { KIND_CHIP } from '@/lib/report/constants';
import { printReportElement } from '@/lib/report/print';
import { asArray, asDisplayText } from '@/lib/ui/prop-guards';

export { KIND_CHIP };

export function OptGroup({ label, children, hint }) {
  const safeLabel = asDisplayText(label);
  const safeHint = asDisplayText(hint);

  return (
    <div className="opt-group">
      <div className="opt-label">{safeLabel}</div>
      {safeHint && <div className="opt-hint">{safeHint}</div>}
      <div className="opt-body">{children}</div>
    </div>
  );
}

export function Seg({ value, onChange, options }) {
  const rowRef = useRef(null);
  const [ind, setInd] = useState(null);
  const safeOptions = asArray(options).map((option, index) => {
    const rawValue =
      option && typeof option === 'object' && !Array.isArray(option) ? option.value : option;
    const valueText = asDisplayText(rawValue);
    const label =
      option && typeof option === 'object' && !Array.isArray(option)
        ? asDisplayText(option.label, valueText)
        : valueText;
    return { rawValue, valueText, label, key: valueText || `option-${index}` };
  });
  const safeValue = asDisplayText(value);
  const handleChange = typeof onChange === 'function' ? onChange : () => {};

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const active = row.querySelector('.seg-pill.active');
    if (!active) {
      setInd(null);
      return;
    }
    setInd({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value]);

  return (
    <div className={'seg-row' + (ind ? ' has-indicator' : '')} ref={rowRef} role="group">
      {ind && <span className="seg-indicator" style={{ left: ind.left, width: ind.width }} />}
      {safeOptions.map(o => (
        <button
          key={o.key}
          role="radio"
          aria-checked={safeValue === o.valueText}
          className={'seg-pill ' + (safeValue === o.valueText ? 'active' : '')}
          onClick={() => handleChange(o.rawValue)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Check({ label, value, onChange, hint }) {
  const safeLabel = asDisplayText(label);
  const safeHint = asDisplayText(hint);
  const handleChange = typeof onChange === 'function' ? onChange : () => {};

  return (
    <label className="opt-check">
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={e => handleChange(e.target.checked)}
      />
      <span className="opt-check-box">
        <Icon.check style={{ width: 12, height: 12 }} />
      </span>
      <div>
        <div className="opt-check-label">{safeLabel}</div>
        {safeHint && <div className="opt-check-hint">{safeHint}</div>}
      </div>
    </label>
  );
}

function triggerPrint(reportMeta) {
  const preview = document.querySelector('.report-paper');
  printReportElement(preview, reportMeta);
}

export default function ReportBuilderShell({
  breadcrumb,
  title,
  sub,
  kind,
  options,
  preview,
  exportNote,
  reportMeta = {},
  dataError,
  isLoading = false,
  docFormat = { pdf: true, excel: false },
  onExcelExport,
}) {
  const [generating, setGenerating] = useState(false);
  const generatingTimer = useRef(null);
  const kindMeta = KIND_CHIP[kind] || KIND_CHIP.sales;
  const safeDocFormat = docFormat && typeof docFormat === 'object' ? docFormat : {};
  const safeDataError = asDisplayText(dataError);
  const safeExportNote = asDisplayText(exportNote);
  const handleExcelExport = typeof onExcelExport === 'function' ? onExcelExport : null;

  useEffect(() => () => clearTimeout(generatingTimer.current), []);

  const handleGenerate = async () => {
    if (!safeDocFormat.pdf && !safeDocFormat.excel) {
      showToast('문서 형식을 하나 이상 선택해 주세요', 'error');
      return;
    }
    setGenerating(true);
    try {
      if (safeDocFormat.pdf) triggerPrint(reportMeta);
      if (safeDocFormat.excel && handleExcelExport) await Promise.resolve(handleExcelExport());
      showToast('보고서 생성 요청 완료', 'ok', 1800);
    } catch (err) {
      const message = err?.message || '알 수 없는 오류';
      showToast(`보고서 생성 실패: ${message}`, 'error');
    } finally {
      clearTimeout(generatingTimer.current);
      generatingTimer.current = setTimeout(() => setGenerating(false), 700);
    }
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        sub={sub}
        actions={
          <>
            <button
              className="btn primary"
              onClick={handleGenerate}
              disabled={generating || isLoading}
            >
              <Icon.download style={{ width: 14, height: 14 }} />
              {generating ? '생성 중…' : '보고서 생성'}
            </button>
          </>
        }
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
              <span className="mono muted" style={{ fontSize: 12 }}>
                RPT-DRAFT
              </span>
              <span className="chip" style={{ background: kindMeta.bg, color: kindMeta.color }}>
                {kindMeta.label}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="report-loading">
              <div className="report-loading-spinner" />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>데이터 불러오는 중…</span>
            </div>
          ) : safeDataError ? (
            <div className="report-empty-banner">
              <Icon.alert style={{ width: 18, height: 18, flexShrink: 0, color: 'var(--warn)' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 3 }}>데이터를 불러올 수 없어요</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{safeDataError}</div>
              </div>
            </div>
          ) : (
            <div className="report-paper">{preview}</div>
          )}

          {safeExportNote && (
            <div className="report-export-note">
              <Icon.alert style={{ width: 14, height: 14, color: 'var(--accent)' }} />
              <span>{safeExportNote}</span>
            </div>
          )}
          {generating && (
            <div className="report-export-note" aria-live="polite">
              <div className="report-loading-spinner" style={{ width: 14, height: 14 }} />
              <span>보고서 파일을 준비하고 있습니다.</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
