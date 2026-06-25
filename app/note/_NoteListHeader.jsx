'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { NoteBatchToolbar } from './_NoteBatchToolbar';

const ACTIONS_STYLE = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  minWidth: 0,
  width: '100%',
  maxWidth: '100%',
  flex: '1 1 100%',
};

function noteListSubText(notesCount) {
  const count = Number(notesCount) || 0;
  return count > 0 ? `전체 ${count.toLocaleString('ko-KR')}개` : '노트 없음';
}

export function NoteListHeader({
  notesCount,
  batchMode,
  selected,
  reportingCount,
  reportExportCount = 0,
  canEdit = false,
  onBulkCopy,
  onExportReportPdf,
  onEnterBatchMode,
  onCalendar,
  onChecklist,
  onBoard,
  onWrite,
  onBatchStatusChange,
  onBatchDelete,
  onBatchExit,
}) {
  return (
    <PageHeader
      breadcrumb={['메뉴개발노트', '노트 목록']}
      title="메뉴개발노트"
      sub={noteListSubText(notesCount)}
      actions={
        <div style={ACTIONS_STYLE}>
          {batchMode ? (
            <NoteBatchToolbar
              selected={selected}
              onStatusChange={onBatchStatusChange}
              onDelete={onBatchDelete}
              onExit={onBatchExit}
            />
          ) : (
            <>
              <button className="btn" onClick={onExportReportPdf} disabled={reportExportCount === 0}>
                <Icon.doc style={{ width: 13, height: 13 }} /> 전체 보고서 PDF
              </button>
              {reportingCount > 0 && (
                <button
                  className="btn"
                  onClick={onBulkCopy}
                  style={{
                    color: 'var(--color-reporting)',
                    borderColor: 'var(--color-reporting-dim, #6B3FCB40)',
                  }}
                >
                  <Icon.doc style={{ width: 13, height: 13 }} /> 출시예정 일괄복사
                </button>
              )}
              <button className="btn" onClick={onEnterBatchMode} disabled={!canEdit}>
                선택
              </button>
              <button className="btn" onClick={onCalendar}>
                달력 뷰
              </button>
              <button className="btn" onClick={onChecklist}>
                체크리스트 목록
              </button>
              <button className="btn" onClick={onBoard}>
                칸반 보드
              </button>
              <button className="btn primary" onClick={onWrite} disabled={!canEdit}>
                <Icon.plus style={{ width: 14, height: 14 }} /> 노트 작성
              </button>
            </>
          )}
        </div>
      }
    />
  );
}
