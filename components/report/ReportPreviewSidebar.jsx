'use client';
import { Icon } from '@/components/icons';
import { KIND_COLOR, KIND_LABEL } from '@/lib/report/constants';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { formatReportDate, REPORT_PREVIEW_PAGES } from '@/components/report/ReportPreviewPages';

export function ReportPreviewSidebar({
  report,
  currentPage,
  onPage,
  onClose,
  onShare,
  onPrint,
}) {
  const kind = asDisplayText(report.kind);
  const color = KIND_COLOR[kind] || '#888';
  const name = asDisplayText(report.name, '보고서');
  const period = asDisplayText(report.period, '—');
  const author = asDisplayText(report.author, '—');
  const createdAt = formatReportDate(report.createdAt, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="preview-meta">
      <button className="modal-close" onClick={onClose} style={{ marginBottom: 24 }}>
        <Icon.x style={{ width: 20, height: 20 }} />
      </button>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            borderRadius: 12,
            background: color + '1A',
            color,
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {KIND_LABEL[kind] || '보고서'}
        </div>
        <div
          id="preview-modal-title"
          style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}
        >
          {name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{period}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
        <div>작성자: {author}</div>
        <div>생성일: {createdAt}</div>
      </div>
      <div style={{ marginBottom: 20 }}>
        {REPORT_PREVIEW_PAGES.map((page, index) => (
          <button
            key={page.title}
            onClick={() => onPage(index + 1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '7px 10px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              background: currentPage === index + 1 ? color + '1A' : 'transparent',
              color: currentPage === index + 1 ? color : 'var(--text-2)',
              fontWeight: currentPage === index + 1 ? 700 : 400,
              fontSize: 13,
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.6, minWidth: 16 }}>{index + 1}</span>
            {page.title}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="btn sm primary" onClick={onShare}>
          <Icon.upload style={{ width: 12, height: 12 }} />
          공유
        </button>
        <button className="btn sm" onClick={onPrint}>
          <Icon.download style={{ width: 12, height: 12 }} />
          PDF
        </button>
      </div>
      <div
        style={{
          borderTop: '1px solid var(--border)',
          marginTop: 16,
          paddingTop: 16,
          fontSize: 11,
          color: 'var(--text-4)',
        }}
      >
        <div>← → : 페이지 이동</div>
        <div>Esc : 닫기</div>
      </div>
    </div>
  );
}
