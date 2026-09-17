// 메뉴개발노트 PDF 보고서 출력 모듈의 재수출 허브.
// 실제 구현은 lib/note/report-print/ 아래 클러스터별 파일에 있다:
//   format.js   — 이스케이프·날짜·원가 포맷 헬퍼
//   groups.js   — 메뉴(차수 체인) 그룹화·정렬·집계
//   sections.js — HTML 섹션 렌더러(집계표·카드)
//   styles.js   — 인라인 CSS 문자열
//   document.js — 전체 문서 조립·인쇄 창
export { formatNoteReportDownloadDate } from './report-print/format';
export { buildMenuDevelopmentReportSummary } from './report-print/groups';
export {
  buildMenuDevelopmentReportHtml,
  printMenuDevelopmentReport,
} from './report-print/document';
