'use client';
import { useState, useMemo } from 'react';

export function normalizePageTarget(value, totalPages) {
  const maxPage = Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1;
  const page = Number(value);
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.min(Math.floor(page), maxPage));
}

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

  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 50;
  const total = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = normalizePageTarget(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * safePageSize;
    return Array.isArray(items) ? items.slice(start, start + safePageSize) : [];
  }, [items, currentPage, safePageSize]);

  const goTo = p => setPage(normalizePageTarget(p, totalPages));

  return { page: currentPage, goTo, totalPages, paged, total };
}
