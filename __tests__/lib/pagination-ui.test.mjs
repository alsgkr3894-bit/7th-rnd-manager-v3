import { describe, expect, test } from '@jest/globals';
import {
  buildPaginationPages,
  normalizePaginationState,
} from '../../lib/ui/pagination.js';

describe('pagination ui helpers', () => {
  test('비정상 숫자를 안전한 페이지 상태로 정규화한다', () => {
    expect(normalizePaginationState({
      page: 'bad',
      totalPages: 5,
      total: 'bad',
      pageSize: 0,
    })).toEqual({
      page: 1,
      totalPages: 5,
      total: 0,
      pageSize: 1,
      start: 0,
      end: 0,
    });
  });

  test('현재 페이지와 표시 범위를 유효 범위 안으로 제한한다', () => {
    expect(normalizePaginationState({
      page: 99,
      totalPages: 3,
      total: 125,
      pageSize: 50,
    })).toEqual({
      page: 3,
      totalPages: 3,
      total: 125,
      pageSize: 50,
      start: 101,
      end: 125,
    });
  });

  test('전체 페이지가 없거나 1페이지뿐이면 표시 범위는 0으로 둔다', () => {
    expect(normalizePaginationState({ page: 1, totalPages: 1, total: 7, pageSize: 10 }).start).toBe(0);
    expect(normalizePaginationState({ page: 1, totalPages: 0, total: 0, pageSize: 10 }).end).toBe(0);
  });

  test('페이지 번호 목록은 작은 페이지 수를 그대로 펼친다', () => {
    expect(buildPaginationPages(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test('페이지 번호 목록은 긴 구간에 ellipsis를 넣는다', () => {
    expect(buildPaginationPages(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(buildPaginationPages(1, 10)).toEqual([1, 2, null, 10]);
    expect(buildPaginationPages(10, 10)).toEqual([1, null, 9, 10]);
  });
});
