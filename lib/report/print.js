/**
 * lib/report/print.js — 보고서 PDF/인쇄 출력 헬퍼
 *
 * 브라우저 print dialog를 사용하되, 앱 전체가 아니라 전달받은 report-paper만
 * 임시 print root로 복제해 출력한다.
 */

import { getActiveBrand } from '@/lib/active-brand';
import { pad } from '@/lib/format';
import { asDisplayText } from '@/lib/ui/prop-guards';

const PRINT_ROOT_ID = '__report-print-root';
const CLEANUP_DELAY_MS = 5000;

function compactTitlePart(value) {
  return asDisplayText(value)
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function formatPeriodForTitle(period) {
  const raw = asDisplayText(period).trim();
  if (!raw) return '';
  return raw.replace(
    /(\d{4})년\s*(\d{1,2})월/,
    (_, year, month) => `${year}년${String(month).padStart(2, '0')}월`
  );
}

function asPlainObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function asValidDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : new Date();
}

function getCleanupDelayMs(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : CLEANUP_DELAY_MS;
}

function getPrintableElements(elements) {
  const list =
    elements &&
    (typeof elements[Symbol.iterator] === 'function' || typeof elements.length === 'number')
      ? elements
      : [elements];
  return Array.from(list || []).filter(item => item && typeof item.cloneNode === 'function');
}

export function makeReportPrintTitle(reportMeta = {}, options = {}) {
  const safeReportMeta = asPlainObject(reportMeta);
  const safeOptions = asPlainObject(options);
  const now = asValidDate(safeOptions.now);
  const activeBrand = getActiveBrand();
  const brandName = compactTitlePart(safeOptions.brandName || activeBrand?.name);
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rawPeriod = asDisplayText(safeReportMeta.period).trim();
  const periodPart = compactTitlePart(formatPeriodForTitle(rawPeriod));
  const nameWithoutPeriod = (asDisplayText(safeReportMeta.name) || '보고서')
    .replace(rawPeriod, '')
    .trim();
  const namePart = compactTitlePart(nameWithoutPeriod) || '보고서';
  const middle = [periodPart, namePart].filter(Boolean).join(' ');

  return [brandName, middle, dateStr].filter(Boolean).join('_');
}

export function printReportElements(elements, reportMeta = {}, options = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('브라우저에서만 출력할 수 있습니다.');
  }

  const safeOptions = asPlainObject(options);
  const papers = getPrintableElements(elements);
  if (papers.length === 0) {
    throw new Error('출력할 보고서 미리보기가 없습니다.');
  }

  document.getElementById(PRINT_ROOT_ID)?.remove();

  const title = makeReportPrintTitle(reportMeta, safeOptions);
  const prevTitle = document.title;
  document.title = title;

  const printRoot = document.createElement('div');
  printRoot.id = PRINT_ROOT_ID;
  papers.forEach(paper => {
    const clone = paper.cloneNode(true);
    clone.classList?.add('report-print-page');
    printRoot.appendChild(clone);
  });
  document.body.appendChild(printRoot);

  const style = document.createElement('style');
  style.textContent = `
    @media print {
      @page { margin: 10mm 12mm; size: A4 portrait; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
      #${PRINT_ROOT_ID} {
        display: block !important;
        background: #fff !important;
        width: 100% !important;
      }
      #${PRINT_ROOT_ID} .report-paper {
        box-shadow: none !important;
        min-height: unset !important;
        border-radius: 0 !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        /* 768px 이하 모바일 미디어쿼리(app/styles/features/settings.css)가 A4 인쇄 폭
           (10mm/12mm 여백 기준 약 703px)에서도 함께 매치돼 overflow:hidden을 건다.
           페이지 분할 대신 잘림이 나므로 인쇄 중에는 항상 visible로 강제한다. */
        overflow: visible !important;
      }
      #${PRINT_ROOT_ID} .report-paper::before { display: none !important; }
      #${PRINT_ROOT_ID} .report-print-page + .report-print-page {
        break-before: page;
        page-break-before: always;
      }
      #${PRINT_ROOT_ID} .paper-section {
        break-inside: auto !important;
        page-break-inside: auto !important;
        /* 위와 같은 이유 — 모바일 미디어쿼리의 overflow-x:auto를 인쇄 중에는 무효화 */
        overflow: visible !important;
      }
      #${PRINT_ROOT_ID} .paper-cat-section + .paper-cat-section {
        break-before: auto !important;
        page-break-before: auto !important;
        margin-top: 16px !important;
      }
      #${PRINT_ROOT_ID} .paper-table-scroll {
        overflow: visible !important;
        width: 100% !important;
      }
      #${PRINT_ROOT_ID} .paper-table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 10.5px !important;
      }
      #${PRINT_ROOT_ID} .paper-table th,
      #${PRINT_ROOT_ID} .paper-table td {
        padding: 5px 6px !important;
        overflow-wrap: anywhere !important;
        word-break: keep-all !important;
      }
      #${PRINT_ROOT_ID} .paper-table thead {
        display: table-header-group !important;
      }
      #${PRINT_ROOT_ID} .paper-table tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      /* 단종/비정규메뉴 배지는 var(--text-3) 등 다크모드 테마 색을 쓴다. 인쇄는 배경을
         강제로 흰색 처리하는 프린터/PDF 드라이버가 많아(-webkit-print-color-adjust를
         지키지 않는 경우 포함), 다크모드에서 쓰던 밝은 회색·주황 글자가 흰 배경 위에서
         거의 안 보이게 되는 문제가 있었다 — 인쇄 중에는 테마와 무관한 고정 고대비 색으로
         덮어써 항상 읽히게 한다. 해제(×) 버튼은 인쇄물에서 의미가 없으므로 숨긴다. */
      #${PRINT_ROOT_ID} .discontinued-badge {
        background: #eceef1 !important;
        color: #333333 !important;
        border: 1px solid #9aa0a8 !important;
      }
      #${PRINT_ROOT_ID} .irregular-menu-badge {
        background: #fff3e0 !important;
        color: #7a4a00 !important;
        border: 1px solid #c76a00 !important;
      }
      #${PRINT_ROOT_ID} .discontinued-badge button,
      #${PRINT_ROOT_ID} .irregular-menu-badge button {
        display: none !important;
      }
      .recipe-print-overview { display: none !important; }
      #${PRINT_ROOT_ID} .recipe-print-menu-page {
        /* .recipe-print-menu-page는 paper-section을 겸한다(RecipePrintView.jsx).
           위 .paper-section { break-inside: auto !important }가 이 규칙을 덮어쓰지
           않도록 반드시 !important를 유지한다 — 레시피 한 장은 페이지 중간에서 잘리면 안 된다. */
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      #${PRINT_ROOT_ID} .recipe-print-menu-page + .recipe-print-menu-page {
        break-before: page;
        page-break-before: always;
      }
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
  setTimeout(cleanup, getCleanupDelayMs(safeOptions.cleanupDelayMs));
}

export function printReportElement(element, reportMeta = {}, options = {}) {
  printReportElements(element ? [element] : [], reportMeta, options);
}
