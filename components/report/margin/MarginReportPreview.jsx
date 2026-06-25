import { getProfile } from '@/lib/profile';
import { formatNumber } from '@/lib/format';
import { buildMarginExcelRows, formatMarginDownloadDate } from '@/lib/cost/margin/export';
import { buildMarginReportSummary } from '@/lib/cost/margin/report-options';

function displayCell(value) {
  if (value === '' || value == null) return '—';
  if (typeof value === 'number' && Number.isFinite(value)) return formatNumber(Math.round(value));
  return String(value);
}

function PreviewTable({ rows, sizeLabels, viewMode, activePlatform, discount }) {
  const sheetRows = buildMarginExcelRows(rows, sizeLabels, viewMode, activePlatform, discount);
  const headers = sheetRows[0] || [];
  const bodyRows = sheetRows.slice(1);

  return (
    <table className="paper-table" style={{ tableLayout: 'fixed' }}>
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={`${header}-${index}`} style={index >= 2 ? { textAlign: 'right' } : null}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bodyRows.length ? (
          bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((_, index) => (
                <td key={index} style={index >= 2 ? { textAlign: 'right' } : null}>
                  {displayCell(row[index])}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={Math.max(headers.length, 1)} style={{ textAlign: 'center' }}>
              출력할 메뉴가 없습니다
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="paper-stat">
      <div className="paper-stat-label">{label}</div>
      <div className="paper-stat-value">{value}</div>
      {sub && <div className="paper-stat-sub">{sub}</div>}
    </div>
  );
}

export function MarginReportPreview({
  rows,
  sections,
  activePlatform,
  discount,
  viewMode,
  selectedCategoryCount,
  selectedEdgeCount,
  selectedSizeCount,
}) {
  const summary = buildMarginReportSummary(rows, activePlatform, discount, viewMode);
  const modeLabel = viewMode === 'margin' ? '마진율' : '원가율';
  const downloadDate = formatMarginDownloadDate();

  return (
    <>
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · 원가마진표</div>
        <h2 className="paper-title">메뉴 원가마진표</h2>
        <div className="paper-meta">
          <span>대상: {summary.rowCount}개 메뉴</span>
          <span>·</span>
          <span>{selectedCategoryCount}개 카테고리</span>
          <span>·</span>
          <span>{selectedEdgeCount}개 엣지</span>
          <span>·</span>
          <span>{selectedSizeCount}개 사이즈</span>
          <span>·</span>
          <span className="mono">
            출력일 {downloadDate} · {getProfile().name}
          </span>
        </div>
      </div>

      <div className="paper-stat-row">
        <SummaryCard label="출력 메뉴" value={`${formatNumber(summary.rowCount)}개`} />
        <SummaryCard label="카테고리" value={`${formatNumber(summary.categoryCount)}개`} />
        <SummaryCard label="플랫폼" value={activePlatform?.name || '기본'} />
        <SummaryCard
          label={`평균 ${modeLabel}`}
          value={summary.metricCount ? `${summary.avgMetric.toFixed(1)}%` : '—'}
          sub={`${formatNumber(summary.metricCount)}개 가격 기준`}
        />
      </div>

      {sections.length ? (
        sections.map(section => (
          <section key={section.id} className="paper-cat-section">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <h3>{section.title}</h3>
              <span className="muted" style={{ fontSize: 11 }}>
                {section.rows.length}개 메뉴 · {section.sizeLabels.join(', ')}
              </span>
            </div>
            <PreviewTable
              rows={section.rows}
              sizeLabels={section.sizeLabels}
              viewMode={viewMode}
              activePlatform={activePlatform}
              discount={discount}
            />
          </section>
        ))
      ) : (
        <div className="report-empty-banner">선택한 조건에 맞는 원가마진표 행이 없습니다.</div>
      )}

      <div className="paper-foot">
        <span>원가마진표 보고서</span>
        <span className="mono">7번가 R&amp;D 플랫폼</span>
      </div>
    </>
  );
}
