/**
 * lib/report/print.js — 보고서 PDF/인쇄 출력 헬퍼
 *
 * 브라우저 print dialog를 사용하되, 앱 전체가 아니라 전달받은 report-paper만
 * 임시 print root로 복제해 출력한다.
 */

import { getActiveBrand } from '@/lib/active-brand';
import { pad } from '@/lib/format';

const PRINT_ROOT_ID = '__report-print-root';
const CLEANUP_DELAY_MS = 5000;

function compactTitlePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '');
}

function formatPeriodForTitle(period) {
  const raw = String(period || '').trim();
  if (!raw) return '';
  return raw.replace(/(\d{4})년\s*(\d{1,2})월/, (_, year, month) => (
    `${year}년${String(month).padStart(2, '0')}월`
  ));
}

export function makeReportPrintTitle(reportMeta = {}, options = {}) {
  const now = options.now || new Date();
  const brandName = compactTitlePart(options.brandName || getActiveBrand().name);
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rawPeriod = String(reportMeta.period || '').trim();
  const periodPart = compactTitlePart(formatPeriodForTitle(rawPeriod));
  const nameWithoutPeriod = String(reportMeta.name || '보고서').replace(rawPeriod, '').trim();
  const namePart = compactTitlePart(nameWithoutPeriod) || '보고서';
  const middle = [periodPart, namePart].filter(Boolean).join(' ');

  return [brandName, middle, dateStr].filter(Boolean).join('_');
}

export function printReportElements(elements, reportMeta = {}, options = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('브라우저에서만 출력할 수 있습니다.');
  }

  const papers = Array.from(elements || []).filter(Boolean);
  if (papers.length === 0) {
    throw new Error('출력할 보고서 미리보기가 없습니다.');
  }

  document.getElementById(PRINT_ROOT_ID)?.remove();

  const title = makeReportPrintTitle(reportMeta);
  const prevTitle = document.title;
  document.title = title;

  const printRoot = document.createElement('div');
  printRoot.id = PRINT_ROOT_ID;
  papers.forEach(paper => {
    const clone = paper.cloneNode(true);
    clone.classList.add('report-print-page');
    printRoot.appendChild(clone);
  });
  document.body.appendChild(printRoot);

  const style = document.createElement('style');
  style.textContent = `
    @media print {
      @page { margin: 16mm; size: A4 portrait; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
      #${PRINT_ROOT_ID} {
        display: block !important;
        background: #fff !important;
      }
      #${PRINT_ROOT_ID} .report-paper {
        box-shadow: none !important;
        min-height: unset !important;
        border-radius: 0 !important;
        border: none !important;
      }
      #${PRINT_ROOT_ID} .report-paper::before { display: none !important; }
      #${PRINT_ROOT_ID} .report-print-page + .report-print-page {
        break-before: page;
        page-break-before: always;
      }
      .paper-cat-section + .paper-cat-section { break-before: page; }
    }
  `;
  document.head.appendChild(style);

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    document.title = prevTitle;
    printRoot.remove();
    style.remove();
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, options.cleanupDelayMs ?? CLEANUP_DELAY_MS);
}

export function printReportElement(element, reportMeta = {}, options = {}) {
  printReportElements(element ? [element] : [], reportMeta, options);
}
