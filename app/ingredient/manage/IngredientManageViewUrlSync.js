'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { pickManageLinkQuery } from './ingredientManageUtils';

/**
 * 같은 화면에 머문 채 주소만 바뀌는 이동(상단 알림·통합 검색 링크 등)은 페이지를 다시
 * 마운트하지 않으므로, 주소의 파라미터를 구독해 화면 상태에 전달한다.
 * useSearchParams 때문에 Suspense 경계 안에서 렌더해야 한다 — 페이지 전체가 아니라
 * 이 컴포넌트만 감싸도록 분리했다.
 */
export function IngredientManageViewUrlSync({ onViewParam, onLinkParams }) {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');
  const linkQuery = pickManageLinkQuery(searchParams);

  useEffect(() => {
    onViewParam(viewParam);
  }, [viewParam, onViewParam]);

  useEffect(() => {
    if (!linkQuery) return undefined;
    // 첫 마운트에서는 저장된 분류 복원(useLocalStorage)과 Next의 history 연동이 이 effect보다
    // 늦게 실행된다. 한 박자 미뤄야 주소의 분류가 덮이지 않고, 파라미터 제거가 라우터에도
    // 반영돼 같은 링크로 다시 이동할 수 있다.
    const timer = setTimeout(() => onLinkParams(new URLSearchParams(linkQuery)), 0);
    return () => clearTimeout(timer);
  }, [linkQuery, onLinkParams]);

  return null;
}
