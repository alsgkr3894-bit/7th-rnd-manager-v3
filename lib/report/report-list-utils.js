import { loadXlsx } from '@/lib/excel';
import { makeFileNameWithBrand, withDownloadDateSuffix } from '@/lib/download';
import { KIND_CHIP } from '@/lib/report/constants';
import { asDisplayText, asObjectArray, asFiniteNumber } from '@/lib/ui/prop-guards';

export function formatReportId(id) {
  const text = asDisplayText(id);
  return text ? `RPT-${text.padStart(4, '0')}` : '—';
}

export function formatReportDate(value) {
  const raw = asDisplayText(value);
  if (!raw) return '—';
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function safeReportKind(kind) {
  return asDisplayText(kind);
}

export function reportNumber(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

export async function exportReportListToExcel(rows) {
  const XLSX = await loadXlsx();
  const data = asObjectArray(rows).map(r => ({
    ID: formatReportId(r.id),
    유형: KIND_CHIP[safeReportKind(r.kind)]?.label || safeReportKind(r.kind),
    제목: asDisplayText(r.name),
    '대상 기간': asDisplayText(r.period, '—') || '—',
    작성자: asDisplayText(r.author, '—') || '—',
    생성일: formatReportDate(r.createdAt),
    조회수: reportNumber(r.views),
    즐겨찾기: r.fav ? '★' : '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '보고서 목록');
  XLSX.writeFile(wb, makeFileNameWithBrand('보고서 목록', 'xlsx'));
}
