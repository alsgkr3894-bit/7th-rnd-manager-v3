'use client';

import { useCallback } from 'react';
import { showToast } from '@/components/Toast';
import { printMenuDevelopmentReport } from '@/lib/note/report-print';

export function useNoteReportPdf(notes, options = {}) {
  return useCallback(() => {
    const safeNotes = Array.isArray(notes) ? notes : [];
    if (safeNotes.length === 0) {
      showToast('PDF로 출력할 메뉴개발노트가 없어요', 'warn');
      return;
    }

    try {
      const opened = printMenuDevelopmentReport(safeNotes, {
        title: '메뉴개발노트 전체 보고서',
        scopeLabel: options.scopeLabel || '현재 목록 전체',
      });
      if (opened)
        showToast(`메뉴개발노트 ${safeNotes.length}건 PDF 출력 창을 열었어요`, 'ok', 1800);
    } catch (err) {
      showToast('PDF 보고서 출력 실패: ' + (err?.message || '알 수 없는 오류'), 'error');
    }
  }, [notes, options.scopeLabel]);
}
