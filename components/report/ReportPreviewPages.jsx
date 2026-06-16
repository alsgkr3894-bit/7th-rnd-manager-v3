'use client';

import { ReportCover } from './preview-pages/ReportCover';
import { ReportOptionsPage } from './preview-pages/ReportOptionsPage';
import { ReportSummaryPage } from './preview-pages/ReportSummaryPage';
export { asPlainObject, formatReportDate } from './preview-pages/reportPreviewPageUtils';

export const REPORT_PREVIEW_PAGES = [
  { title: '표지', render: report => <ReportCover report={report} /> },
  { title: '보고서 설정', render: report => <ReportOptionsPage report={report} /> },
  { title: '요약 정보', render: report => <ReportSummaryPage report={report} /> },
];

export function ReportPaper({ report, pageIndex }) {
  const page = REPORT_PREVIEW_PAGES[pageIndex];
  if (!page) return null;

  return (
    <div className="report-paper preview-paper">
      {page.render(report)}
      <div className="paper-foot" style={{ marginTop: 24 }}>
        <span>
          {pageIndex + 1} / {REPORT_PREVIEW_PAGES.length} — {page.title}
        </span>
        <span className="mono">7번가 R&amp;D 플랫폼</span>
      </div>
    </div>
  );
}
