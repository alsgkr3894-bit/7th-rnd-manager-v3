'use client';

import { showToast } from '@/components/Toast';
import { getActiveBrand } from '@/lib/active-brand';
import { buildMarketPrintHtml } from '@/lib/note/market-print';
import { openPrintWindow } from '@/lib/print/window-print';
import { describeMarketFilters } from './marketFilterUtils';

/**
 * 시장조사 PDF 출력 — 목록(걸어 둔 필터·검색 결과)과 기록 한 건 두 가지를 낸다.
 * 인쇄 창은 about:blank라 로고는 절대 URL로 넘긴다.
 */
export function useMarketPrint({ filtered, filters, query }) {
  function open(rows, filterLabel, title) {
    if (!rows.length) {
      showToast('출력할 시장조사가 없습니다', 'warn');
      return;
    }
    openPrintWindow(
      buildMarketPrintHtml(rows, {
        filterLabel,
        title,
        brandName: getActiveBrand()?.name,
        logoSrc:
          typeof window === 'undefined' ? '' : `${window.location.origin}/logo-taemyeong.png`,
      }),
      { width: 800, height: 900 }
    );
  }

  return {
    // 목록은 최근 조사일이 위에 오는 화면 순서 그대로 낸다
    printList: () =>
      open(
        filtered,
        describeMarketFilters({
          region: filters?.region,
          brandType: filters?.brandType,
          country: filters?.country,
          query,
        }),
        '시장조사 보고서'
      ),
    printOne: row =>
      open(row ? [row] : [], String(row?.date || '').trim() || '1건', '시장조사 보고서'),
  };
}
