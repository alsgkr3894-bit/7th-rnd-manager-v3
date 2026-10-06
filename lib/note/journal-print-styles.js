/**
 * lib/note/journal-print-styles.js — 연구일지 PDF(인쇄 창) 스타일
 *
 * journal-print.js의 HTML 조립과 분리했다(파일 절반이 CSS였다). 내용 그대로 <style> 안에 들어간다.
 */
export const JOURNAL_PRINT_STYLES = `  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif;
    font-size: 11pt;
    color: #111;
    background: #fff;
    padding: 0;
  }
  @page { size: A4 portrait; margin: 18mm 16mm; }

  .doc-header {
    border: 2px solid #111;
    padding: 14px 16px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .doc-title { font-size: 23pt; font-weight: 800; letter-spacing: 0; }
  .doc-sub { font-size: 10pt; color: #555; margin-top: 4px; }
  .doc-brand { font-size: 10pt; color: #222; font-weight: 700; margin-top: 2px; }
  .doc-date { font-size: 12pt; font-weight: 700; text-align: right; }
  .doc-logo { height: 34px; width: auto; display: block; margin: 0 0 6px auto; }
  .summary-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid #ccc;
    border-bottom: none;
    margin-bottom: 12px;
  }
  .summary-cell {
    padding: 8px 10px;
    border-right: 1px solid #ccc;
    font-size: 10pt;
  }
  .summary-cell:last-child { border-right: none; }
  .summary-label {
    display: block;
    color: #666;
    font-size: 8.5pt;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .report-card {
    border: 1px solid #bbb;
    border-radius: 4px;
    margin-bottom: 12px;
    overflow: visible;
  }
  .report-card-header {
    border-bottom: 1px solid #ccc;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: #f7f7f7;
    break-after: avoid;
    break-inside: avoid;
  }
  .report-kicker { font-size: 8.5pt; font-weight: 800; color: #444; margin-bottom: 2px; }
  .report-title { font-size: 14pt; font-weight: 800; }
  .note-chips { display: flex; gap: 4px; flex-shrink: 0; }
  .chip {
    font-size: 8.5pt; font-weight: 700;
    padding: 2px 7px; border-radius: 999px;
    white-space: nowrap;
  }
  .chip-type { background: #dbeafe; color: #1d4ed8; }

  .report-meta {
    padding: 7px 12px;
    font-size: 10pt;
    color: #444;
    display: flex;
    gap: 16px;
    border-bottom: 1px solid #eee;
  }

  .report-sections {
    display: grid;
    grid-template-columns: 1fr;
  }
  .report-section {
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  /* 긴 본문(보고서 한 칸)은 통째로 다음 장으로 넘기면 앞 장에 큰 빈칸이 생겨 쪽 사이에서 나눈다 */
  .report-section.long { break-inside: auto; page-break-inside: auto; }
  .report-section.long .section-label { break-after: avoid; page-break-after: avoid; }
  .report-section.long .section-body { orphans: 3; widows: 3; }
  .section-label {
    font-size: 9pt;
    font-weight: 800;
    color: #333;
    margin-bottom: 4px;
  }
  .section-body {
    font-size: 10.5pt;
    line-height: 1.75;
    white-space: normal;
  }

  .photos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 10px 12px;
    border-top: 1px solid #eee;
  }
  .photo-wrap { break-inside: avoid; page-break-inside: avoid; }
  .photo-wrap img {
    width: 100%;
    max-height: 200px;
    object-fit: contain;
    border-radius: 3px;
    display: block;
  }
  .photo-caption {
    font-size: 8pt;
    color: #777;
    margin-top: 2px;
    text-align: center;
  }

  .tags {
    padding: 6px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    border-top: 1px solid #eee;
  }
  .tag {
    font-size: 8.5pt;
    padding: 1px 6px;
    border-radius: 999px;
    background: #f3f3f3;
    color: #555;
  }

  .doc-footer {
    margin-top: 20px;
    padding-top: 8px;
    border-top: 1px solid #ccc;
    font-size: 9pt;
    color: #aaa;
    text-align: center;
  }
`;
