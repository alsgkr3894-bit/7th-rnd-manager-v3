'use client';

import { KIND_COLOR, KIND_EMOJI, KIND_LABEL } from '@/lib/report/constants';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { formatReportDate } from './reportPreviewPageUtils';

export function ReportCover({ report }) {
  const kind = asDisplayText(report.kind);
  const color = KIND_COLOR[kind] || '#888';
  const label = KIND_LABEL[kind] || '';
  const name = asDisplayText(report.name, '보고서');
  const period = asDisplayText(report.period, '—');
  const author = asDisplayText(report.author);
  const createdAt = formatReportDate(report.createdAt, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 0 32px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: 16,
          background: color + '1A',
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 22 }}>{KIND_EMOJI[kind] || '📄'}</span>
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-3)',
          marginBottom: 8,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        7번가피자 본사 · R&amp;D팀
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, lineHeight: 1.3 }}>{name}</h1>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderRadius: 20,
          background: color + '1A',
          color: color,
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 20,
        }}
      >
        {label} 보고서
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>{period}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>생성일: {createdAt}</div>
      {author && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>작성자: {author}</div>
      )}
    </div>
  );
}
