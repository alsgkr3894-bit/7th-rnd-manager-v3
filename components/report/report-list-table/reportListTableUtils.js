import { KIND_CHIP } from '@/lib/report/constants';
import { asDisplayText } from '@/lib/ui/prop-guards';
import {
  formatReportDate,
  formatReportId,
  reportNumber,
  safeReportKind,
} from '@/lib/report/report-list-utils';

export function buildReportListRowModel(report, { deletingId, editingId, newIds }) {
  const kind = safeReportKind(report.kind);
  const originalName = asDisplayText(report.name);
  const reportName = originalName || '이름 없는 보고서';
  const reportId = asDisplayText(report.id);

  return {
    kind,
    chip: KIND_CHIP[kind] || KIND_CHIP.sales,
    originalName,
    reportName,
    reportId,
    rowKey: reportId || `${reportName}-${asDisplayText(report.createdAt)}`,
    displayId: formatReportId(report.id),
    createdLabel: formatReportDate(report.createdAt),
    periodLabel: asDisplayText(report.period, '—') || '—',
    authorLabel: asDisplayText(report.author, '—') || '—',
    views: reportNumber(report.views),
    links: reportNumber(report.links),
    isDeleting: deletingId === report.id,
    isNew: newIds.has(report.id),
    isEditing: editingId === report.id,
  };
}

export function buildReportPaginationItems(totalPages, safePage) {
  return Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(page => page === 1 || page === totalPages || Math.abs(page - safePage) <= 1)
    .reduce((items, page, index, pages) => {
      if (index > 0 && pages[index - 1] !== page - 1) items.push('…');
      items.push(page);
      return items;
    }, []);
}
