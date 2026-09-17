'use client';
import { useCallback, useMemo, useState } from 'react';
import { productCodeKey } from './ingredientManageUtils';

/**
 * 제때 이슈(신규/제외) 탭에서 사용자가 개별 해제한 항목을 목록에서 숨기고,
 * 제외 처리가 실패하면 숨김을 되돌리는 훅.
 */
export function useIngredientJetteIssueVisibility({ newJetteRows, jetteRemovedRows, onExclude }) {
  const [hiddenJetteIssueCodes, setHiddenJetteIssueCodes] = useState(() => new Set());

  const visibleNewJetteRows = useMemo(
    () => newJetteRows.filter(row => !hiddenJetteIssueCodes.has(productCodeKey(row))),
    [newJetteRows, hiddenJetteIssueCodes]
  );
  const visibleJetteRemovedRows = useMemo(
    () => jetteRemovedRows.filter(row => !hiddenJetteIssueCodes.has(productCodeKey(row))),
    [jetteRemovedRows, hiddenJetteIssueCodes]
  );

  const handleExcludeJetteIssue = useCallback(
    async row => {
      const code = productCodeKey(row);
      if (code) {
        setHiddenJetteIssueCodes(prev => {
          const next = new Set(prev);
          next.add(code);
          return next;
        });
      }
      const ok = await onExclude(row);
      if (!ok && code) {
        setHiddenJetteIssueCodes(prev => {
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
      }
    },
    [onExclude]
  );

  return { visibleNewJetteRows, visibleJetteRemovedRows, handleExcludeJetteIssue };
}
