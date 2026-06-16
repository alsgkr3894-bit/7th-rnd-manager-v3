'use client';

import { KIND_COLOR } from '@/lib/report/constants';
import { asDisplayText, clampInteger } from '@/lib/ui/prop-guards';
import { ReportPreviewOptionRow } from './ReportPreviewOptionRow';

export function ReportSummaryPage({ report }) {
  const kind = asDisplayText(report.kind);
  const color = KIND_COLOR[kind] || '#888';
  const reportId = asDisplayText(report.id);
  const pages = clampInteger(report.pages, { min: 1, fallback: 1 });
  const views = clampInteger(report.views, { min: 0, fallback: 0 });
  const links = clampInteger(report.links, { min: 0, fallback: 0 });

  return (
    <div style={{ padding: '16px 0' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: color,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        요약 정보
      </div>
      <ReportPreviewOptionRow
        label="보고서 ID"
        value={reportId ? `RPT-${reportId.padStart(4, '0')}` : '—'}
      />
      <ReportPreviewOptionRow label="총 페이지" value={`${pages}쪽`} />
      <ReportPreviewOptionRow label="조회수" value={`${views}회`} />
      <ReportPreviewOptionRow label="공유 링크" value={links > 0 ? `${links}개 활성` : '없음'} />
      <div
        style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 8,
          background: 'var(--surface-2)',
          fontSize: 12,
          color: 'var(--text-3)',
          lineHeight: 1.6,
        }}
      >
        ℹ️ 보고서는 생성 시점의 데이터로 고정돼요. 이후 데이터 변경은 반영되지 않아요.
      </div>
    </div>
  );
}
