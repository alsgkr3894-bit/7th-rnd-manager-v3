// 메뉴개발노트 보고서 전체 HTML 문서 조립 + 인쇄 창 열기
import { withDownloadDateSuffix } from '@/lib/download';
import { buildEffectiveNoteStatusById } from '@/lib/note/filter';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';
import { cleanText, esc, formatNoteReportDownloadDate, validDate } from './format';
import {
  buildMenuDevelopmentReportSummary,
  buildReportMenuGroups,
  groupByCategory,
} from './groups';
import { countTable, menuGroupCard } from './sections';
import { REPORT_PRINT_STYLES } from './styles';

export function buildMenuDevelopmentReportHtml(notes, options = {}) {
  const safeNotes = Array.isArray(notes) ? notes.filter(Boolean) : [];
  const menuGroups = buildReportMenuGroups(safeNotes);
  const now = validDate(options.now);
  const title = cleanText(options.title) || '메뉴개발노트 전체 보고서';
  const scopeLabel = cleanText(options.scopeLabel) || '현재 목록 전체';
  const printedDate = formatNoteReportDownloadDate(now);
  const documentTitle = withDownloadDateSuffix(title, now);
  const summary = buildMenuDevelopmentReportSummary(safeNotes);
  const effectiveStatusById = buildEffectiveNoteStatusById(safeNotes);
  const groups = groupByCategory(menuGroups);
  let runningIndex = 0;
  const noteSections = groups.length
    ? groups
        .map(([category, rows]) => {
          const cards = rows
            .map(group => {
              const html = menuGroupCard(group, runningIndex, effectiveStatusById);
              runningIndex += 1;
              return html;
            })
            .join('');
          return `<section class="category-section">
            <div class="category-title"><h2>${esc(category)}</h2><span>${rows.length.toLocaleString('ko-KR')}개 메뉴</span></div>
            ${cards}
          </section>`;
        })
        .join('')
    : '<section class="empty-report">출력할 메뉴개발노트가 없습니다.</section>';

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${esc(documentTitle)}</title>
<style>
${REPORT_PRINT_STYLES}
</style>
</head>
<body>
  <main class="page">
    <header class="cover">
      <div>
        <h1>${esc(title)}</h1>
        <div class="meta">${esc(scopeLabel)} · 최신 차수 기준 메뉴별 상세 보고서</div>
      </div>
      <div class="meta" style="text-align:right">다운로드일 ${esc(printedDate)}<br>총 ${menuGroups.length.toLocaleString('ko-KR')}개 메뉴 · ${summary.total.toLocaleString('ko-KR')}개 차수</div>
    </header>
    <section class="summary-grid">
      <div class="summary-card"><span>노트 수</span><strong>${summary.total.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>메뉴 수</span><strong>${menuGroups.length.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>사진 수</span><strong>${summary.photoCount.toLocaleString('ko-KR')}</strong></div>
      <div class="summary-card"><span>원가 계산</span><strong>${summary.tempCostCount.toLocaleString('ko-KR')}</strong></div>
    </section>
    <section class="count-grid">
      ${countTable('상태별 현황', summary.statusCounts)}
      ${countTable('카테고리별 현황', summary.categoryCounts)}
    </section>
    ${noteSections}
    <footer class="footer">7번가피자 R&amp;D 플랫폼 · 메뉴개발노트 PDF 보고서 · ${esc(printedDate)} 출력</footer>
  </main>
  ${buildAutoPrintScript({ waitForImages: true })}
</body>
</html>`;
}

export function printMenuDevelopmentReport(notes, options = {}) {
  return openPrintWindow(buildMenuDevelopmentReportHtml(notes, options), {
    width: 980,
    height: 1000,
  });
}
