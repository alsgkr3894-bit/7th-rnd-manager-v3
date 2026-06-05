'use client';
import { useState, useMemo } from 'react';

/**
 * 클라이언트-사이드 페이지네이션.
 * items 배열이 바뀌면(필터 변경 등) page가 자동으로 유효 범위로 클램프된다.
 *
 * @param {any[]} items   - 페이지네이션할 전체 배열
 * @param {number} [pageSize=50] - 페이지당 행 수
 * @returns {{ page, goTo, totalPages, paged, total }}
 */
export function usePagination(items, pageSize = 50) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  return { page: currentPage, goTo, totalPages, paged, total };
}
