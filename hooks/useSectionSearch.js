import { useMemo, useState } from 'react';

/**
 * 섹션 공통 검색 상태 훅.
 * search 상태 + filterFn 기반 filtered 목록을 반환.
 * @param {Array} list - 원본 목록
 * @param {(item: any, q: string) => boolean} filterFn - 소문자 trimmed q로 각 항목 판별
 */
export function useSectionSearch(list, filterFn) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(item => filterFn(item, q));
  }, [list, query, filterFn]);

  return { query, setQuery, filtered };
}
