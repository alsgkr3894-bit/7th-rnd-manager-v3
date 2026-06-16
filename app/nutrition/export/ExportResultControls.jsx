export function ExportResultLoading({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            height: 44,
            borderRadius: 8,
            background: 'var(--surface-2)',
            opacity: 1 - index * 0.12,
          }}
        />
      ))}
    </div>
  );
}

export function ExportResultTabs({
  tabs,
  activeKey,
  onChange,
  className = 'origin-result-subtabs',
}) {
  return (
    <div className={`origin-result-tabs ${className}`}>
      {tabs.map(item => (
        <button
          key={item.key}
          type="button"
          className={`origin-result-tab${className.includes('subtabs') ? ' origin-result-subtab' : ''}${activeKey === item.key ? ' active' : ''}`}
          onClick={() => onChange?.(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ExportResultActions({
  exporting,
  onPdf,
  onExcel,
  extraActions = [],
  pdfLabel = '🖨 PDF 통합 출력',
  excelLabel = '⬇ 엑셀 통합 다운로드',
  exportingLabel = '출력 중…',
}) {
  return (
    <div className="origin-result-actions">
      {extraActions.map(action => (
        <button
          key={action.key || action.label}
          type="button"
          className="origin-result-btn"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
      <button type="button" className="origin-result-btn" onClick={onPdf}>
        {pdfLabel}
      </button>
      <button
        type="button"
        className="origin-result-btn primary"
        onClick={onExcel}
        disabled={exporting}
      >
        {exporting ? exportingLabel : excelLabel}
      </button>
    </div>
  );
}
