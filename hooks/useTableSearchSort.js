import { useState } from 'react';

/**
 * 테이블 공통 검색·정렬 상태 훅.
 * search, sortKey, sortDir 상태를 반환. 필터/CSV는 컴포넌트에서 직접 처리.
 */
export function useTableSearchSort(defaultSortKey, defaultSortDir = 'asc') {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  return { search, setSearch, sortKey, setSortKey, sortDir, setSortDir };
}
