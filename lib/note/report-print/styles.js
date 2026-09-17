// 메뉴개발노트 보고서 인쇄 HTML에 인라인되는 CSS 문자열
// 주의: 문서 템플릿의 <style> 태그 안에 그대로 삽입되므로 앞뒤 들여쓰기·줄바꿈을 유지한다.
export const REPORT_PRINT_STYLES = `  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #111827; font-family: Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; font-size: 10.5pt; }
  .page { padding: 14mm 15mm; }
  .cover { border-bottom: 3px solid #111827; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; }
  h1 { margin: 0 0 5px; font-size: 22pt; letter-spacing: 0; }
  .meta { color: #4b5563; font-size: 9.5pt; line-height: 1.6; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin: 12px 0; }
  .summary-card { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 9px; }
  .summary-card span { display: block; color: #6b7280; font-size: 8.5pt; margin-bottom: 3px; }
  .summary-card strong { font-size: 13pt; }
  .count-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0 16px; }
  .count-box { border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
  .count-box h2 { margin: 0; background: #f3f4f6; padding: 7px 9px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-top: 1px solid #e5e7eb; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f9fafb; color: #374151; font-size: 8.5pt; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .category-section + .category-section { break-before: page; page-break-before: always; }
  .category-title { margin: 14px 0 8px; padding: 8px 10px; border: 1px solid #111827; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; break-after: avoid; page-break-after: avoid; }
  .category-title h2 { margin: 0; font-size: 14pt; }
  .category-title span { color: #4b5563; font-size: 9pt; font-weight: 800; }
  .note-card { border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 10px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .note-head { display: flex; justify-content: space-between; gap: 12px; padding: 9px 11px; background: #f3f4f6; border-bottom: 1px solid #d1d5db; }
  .round-list { display: grid; gap: 8px; padding: 9px 10px 10px; background: #fff; }
  .round-card { border: 1px solid #e5e7eb; border-radius: 5px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .round-head { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .round-head h3 { font-size: 11.5pt; }
  .note-index { color: #6b7280; font-size: 8.5pt; font-weight: 800; margin-bottom: 2px; }
  h3 { margin: 0; font-size: 13pt; letter-spacing: 0; }
  .note-head p, .round-head p { margin: 3px 0 0; color: #4b5563; font-size: 9pt; }
  .chips { display: flex; align-items: flex-start; gap: 4px; flex-wrap: wrap; justify-content: flex-end; min-width: 120px; }
  .chip { display: inline-flex; border-radius: 999px; padding: 2px 7px; font-size: 8pt; font-weight: 800; white-space: nowrap; background: #dbeafe; color: #1d4ed8; }
  .chip.type { background: #ecfdf5; color: #047857; }
  h4 { margin: 0 0 4px; color: #374151; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0; }
  .field div { line-height: 1.55; white-space: normal; overflow-wrap: anywhere; }
  .field-grid { display: grid; grid-template-columns: 1fr; }
  .field { padding: 8px 11px; border-top: 1px solid #e5e7eb; }
  .temp-cost { padding: 8px 11px; border-top: 1px solid #e5e7eb; }
  .temp-cost-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
  .temp-cost-head span { color: #4b5563; font-size: 8.5pt; }
  .temp-cost table { font-size: 8.5pt; }
  .menu-photos { padding: 9px 11px 0; border-bottom: 1px solid #e5e7eb; }
  .menu-photos .photos { border-top: 0; padding: 5px 0 10px; }
  .photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 10px 11px; border-top: 1px solid #e5e7eb; }
  .photos figure:only-child { grid-column: 1 / -1; }
  figure { margin: 0; break-inside: avoid; }
  img { width: 100%; height: 260px; max-height: 260px; object-fit: contain; display: block; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; }
  figcaption { color: #6b7280; font-size: 8pt; margin-top: 2px; text-align: center; }
  .tags { border-top: 1px solid #e5e7eb; padding: 7px 11px; display: flex; flex-wrap: wrap; gap: 5px; }
  .tags span { background: #f3f4f6; color: #4b5563; border-radius: 999px; padding: 2px 7px; font-size: 8pt; }
  .empty, .empty-report { color: #6b7280; text-align: center; padding: 24px; }
  .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #d1d5db; color: #9ca3af; text-align: center; font-size: 8.5pt; }
  @media print {
    @page { size: A4 portrait; margin: 12mm 12mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 0; }
  }`;
