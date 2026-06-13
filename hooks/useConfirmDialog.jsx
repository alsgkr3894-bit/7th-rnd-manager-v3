'use client';
import { useState, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * 비동기 확인 다이얼로그 훅.
 * showConfirm(opts) → Promise<boolean>  (확인: true, 취소/닫기: false)
 * confirmElement: 컴포넌트 JSX 트리에 한 번 렌더링해야 하는 요소
 */
export function useConfirmDialog() {
  const [state, setState] = useState(null);

  const showConfirm = useCallback(
    opts =>
      new Promise(resolve => {
        setState({
          ...opts,
          onConfirm: () => {
            setState(null);
            resolve(true);
          },
          onCancel: () => {
            setState(null);
            resolve(false);
          },
        });
      }),
    []
  );

  const confirmElement = state ? <ConfirmDialog open {...state} /> : null;

  return { showConfirm, confirmElement };
}
