/**
 * lib/print/no-split-css.js — 인쇄(PDF) 문서 공통 "항목을 쪽 사이에서 자르지 않는다" 규칙
 *
 * 2026-10-19 주임님 지시: 모든 출력에서 항목이 한 쪽 끝에서 반쪽으로 잘리지 않게 한다.
 *   - 표의 행(tr)은 쪽 사이에서 나뉘지 않고 통째로 다음 쪽으로 넘어간다.
 *   - 표가 여러 쪽에 걸치면 머리글(thead)이 쪽마다 다시 찍힌다.
 *   - 사진·그림은 반으로 갈리지 않는다.
 * 카드·구획처럼 출력물마다 다른 "한 항목" 단위는 각 출력의 스타일에서 break-inside: avoid로 정한다.
 * (항목 하나가 한 쪽보다 길면 브라우저가 어쩔 수 없이 나눈다 — 그때도 행·사진은 온전하다.)
 */
export const PRINT_NO_SPLIT_CSS = `
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  img, figure { break-inside: avoid; page-break-inside: avoid; }
`;
