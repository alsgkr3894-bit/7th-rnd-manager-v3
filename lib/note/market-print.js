/**
 * lib/note/market-print.js — 시장조사 PDF 출력용 HTML
 *
 * 연구일지 PDF와 같은 보고서 카드(머리 줄·본문 칸·사진·태그)를 그대로 쓴다. 시장조사 기록을
 * 연구일지가 읽는 통합 레코드로 바꾼 뒤 buildJournalPrintHtml에 문서 이름만 바꿔 넘기므로,
 * 시장 구분·국가·브랜드 업종 등 머리 줄이 두 PDF에서 항상 같다.
 */
import { buildJournalPrintHtml } from '@/lib/note/journal-print';
import { marketResearchToUnifiedRecord } from '@/lib/note/unified-records';

/**
 * @param {object[]} rows - 시장조사 기록(getAllMarketResearch 결과 모양)
 * @param {{ filterLabel?: string, brandName?: string, logoSrc?: string, title?: string }} [options]
 */
export function buildMarketPrintHtml(rows, options = {}) {
  const records = (Array.isArray(rows) ? rows : []).map(marketResearchToUnifiedRecord);
  const filterLabel = String(options.filterLabel ?? '').trim() || '전체';
  return buildJournalPrintHtml(filterLabel, records, {
    title: options.title || '시장조사 보고서',
    subtitle: '시장조사',
    periodLabel: '조회 조건',
    kindLabel: '시장조사',
    fileTitle: `시장조사 보고서 ${filterLabel}.pdf`,
    brandName: options.brandName,
    logoSrc: options.logoSrc,
  });
}
