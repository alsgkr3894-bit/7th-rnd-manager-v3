import { Icon } from '@/components/icons';
import { printCurrentPageWithDownloadDate } from '@/lib/download';

export function CalendarPageActions({
  canExport,
  canEdit = false,
  onExportMonth,
  onAddSchedule,
  onAddNote,
}) {
  return (
    <div className="calendar-actions">
      <button className="btn no-print" onClick={onExportMonth} disabled={!canExport}>
        <Icon.doc style={{ width: 14, height: 14 }} /> PDF
      </button>
      <button
        className="btn no-print"
        onClick={() => printCurrentPageWithDownloadDate('일정 달력')}
      >
        인쇄
      </button>
      <button className="btn no-print" onClick={onAddSchedule} disabled={!canEdit}>
        <Icon.plus style={{ width: 14, height: 14 }} /> 일정 추가
      </button>
      <button className="btn primary no-print" onClick={onAddNote} disabled={!canEdit}>
        <Icon.plus style={{ width: 14, height: 14 }} /> 새 노트
      </button>
    </div>
  );
}
