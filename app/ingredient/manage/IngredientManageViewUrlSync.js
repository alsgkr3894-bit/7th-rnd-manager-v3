'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * 같은 화면에 머문 채 주소의 view만 바뀌는 이동(상단 알림 링크 등)은 페이지를 다시
 * 마운트하지 않으므로, view 파라미터를 구독해 탭에 전달한다.
 * useSearchParams 때문에 Suspense 경계 안에서 렌더해야 한다 — 페이지 전체가 아니라
 * 이 컴포넌트만 감싸도록 분리했다.
 */
export function IngredientManageViewUrlSync({ onViewParam }) {
  const viewParam = useSearchParams().get('view');

  useEffect(() => {
    onViewParam(viewParam);
  }, [viewParam, onViewParam]);

  return null;
}
