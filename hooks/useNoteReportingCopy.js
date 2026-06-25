'use client';
import { useCallback } from 'react';
import { showToast } from '@/components/Toast';
import { NOTE_STATUS, normalizeNoteStatus } from '@/lib/note/constants';
import { copyText } from '@/lib/ui/clipboard';

export function useNoteReportingCopy(notes) {
  return useCallback(async () => {
    const targets = notes.filter(n => normalizeNoteStatus(n.status) === NOTE_STATUS.RELEASE_READY);
    if (!targets.length) {
      showToast('출시예정 노트가 없어요', 'warn');
      return;
    }

    const text = targets
      .map(
        n => `[${n.menuName}] ${n.title}
테스트 내용: ${n.testContent || '—'}
맛 평가: ${n.tasteEval || '—'}
상무님 평가: ${n.managerEval || '—'}
다음 액션: ${n.nextAction || '—'}
보고용 요약: ${n.reportSummary || '—'}`
      )
      .join('\n\n─────────────────\n\n');

    try {
      if (!(await copyText(text))) throw new Error('CLIPBOARD_UNAVAILABLE');
      showToast(`출시예정 ${targets.length}개 복사 완료`, 'ok');
    } catch {
      showToast('복사 실패', 'warn');
    }
  }, [notes]);
}
