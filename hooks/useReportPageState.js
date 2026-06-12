import { useState } from 'react';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { useDraftRestore } from '@/hooks/useDraftRestore';

/**
 * 보고서 페이지 공통 상태 훅.
 * opts / docFormat 상태와 useDraftRestore(opts 부분)를 공통 처리한다.
 * 페이지별 나머지 복원(periodMode, year, month 등)은 onRestoreExtra로 위임.
 *
 * @param {string} draftKey - localStorage 드래프트 키
 * @param {object} initialOpts - opts 초기값
 * @param {(draft: object) => void} [onRestoreExtra] - 페이지별 추가 복원 콜백
 */
export function useReportPageState(draftKey, initialOpts, onRestoreExtra) {
  const [opts, setOpts] = useState(initialOpts);
  const updOpts = makeFieldUpdater(setOpts);
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = makeFieldUpdater(setDocFormat);

  useDraftRestore(draftKey, draft => {
    if (draft.opts && typeof draft.opts === 'object' && !Array.isArray(draft.opts)) {
      setOpts(o => ({ ...o, ...draft.opts }));
    }
    onRestoreExtra?.(draft);
  });

  return { opts, setOpts, updOpts, docFormat, setDocFormat, updFmt };
}
