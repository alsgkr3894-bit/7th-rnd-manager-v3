/**
 * app/note/journal/_JournalSaveBar.jsx — 연구일지 하단 고정 저장 바 (page.jsx에서 분리)
 *
 * 저장·되돌리기·PDF 버튼과 저장 상태 문구. 작성/목록 어느 탭에서도 보여
 * 목록을 보다가도 저장 안 된 보고서가 있는지 알 수 있다.
 */
'use client';
import { StickySaveBar } from '@/components/ui/StickySaveBar';
import { Icon } from '@/components/icons';

export function JournalSaveBar({ form, canEdit, journalEntry, dateLabel, print }) {
  const noPdf = print.printPeriodNotes.length === 0;
  return (
    <StickySaveBar
      onCancel={form.revertJournalForm}
      onSave={form.saveJournalEntry}
      saving={form.saving}
      canSave={canEdit && (form.journalDirty || !journalEntry)}
      cancelLabel="되돌리기"
      saveLabel="보고서 저장"
      savingLabel="저장 중"
      status={
        !canEdit
          ? '관리자만 저장할 수 있습니다'
          : form.journalDirty
            ? `${dateLabel} · 저장 안 된 변경사항`
            : journalEntry
              ? `${dateLabel} · 저장됨`
              : `${dateLabel} · 새 일지`
      }
      extra={
        <button
          type="button"
          className="btn"
          onClick={print.openJournalPdf}
          disabled={noPdf}
          title={noPdf ? 'PDF로 출력할 연구일지가 없습니다' : print.printRangeTitle}
        >
          <Icon.download style={{ width: 13, height: 13 }} /> PDF
        </button>
      }
    />
  );
}
