import { clampInteger } from './prop-guards';

export function normalizePaginationState({ page, totalPages, total, pageSize } = {}) {
  const safeTotalPages = clampInteger(totalPages, { min: 0, fallback: 0 });
  const safePage = clampInteger(page, { min: 1, max: Math.max(1, safeTotalPages), fallback: 1 });
  const safePageSize = clampInteger(pageSize, { min: 1, fallback: 1 });
  const safeTotal = clampInteger(total, { min: 0, fallback: 0 });
  const start = safeTotalPages <= 1 ? 0 : Math.min((safePage - 1) * safePageSize + 1, safeTotal);
  const end = safeTotalPages <= 1 ? 0 : Math.min(safePage * safePageSize, safeTotal);

  return {
    page: safePage,
    totalPages: safeTotalPages,
    total: safeTotal,
    pageSize: safePageSize,
    start,
    end,
  };
}

export function buildPaginationPages(page, totalPages) {
  const { page: safePage, totalPages: safeTotalPages } = normalizePaginationState({ page, totalPages });
  if (safeTotalPages <= 0) return [];
  if (safeTotalPages <= 7) return Array.from({ length: safeTotalPages }, (_, i) => i + 1);

  const pages = [1];
  if (safePage > 3) pages.push(null);

  for (let p = Math.max(2, safePage - 1); p <= Math.min(safeTotalPages - 1, safePage + 1); p += 1) {
    pages.push(p);
  }

  if (safePage < safeTotalPages - 2) pages.push(null);
  pages.push(safeTotalPages);
  return pages;
}
