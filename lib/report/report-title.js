/**
 * lib/report/report-title.js — 보고서 화면·인쇄 제목에 붙일 브랜드명 (순수)
 *
 * 앱은 태명F&T 산하 브랜드 3개(7번가피자·차이나X4·이천밥쌤)를 함께 쓰므로, 원가표·판매량
 * 보고서 제목에 어느 브랜드의 보고서인지 밝힌다. 예: "7번가피자 제품원가표 (단가 기준)",
 * "7번가피자 2026년 6월 판매량 보고서".
 *
 * 파일명(makeReportPrintTitle)은 이미 "브랜드_기간 이름"으로 브랜드를 붙이므로 reportMeta.name에는
 * 브랜드를 넣지 않는다 — 넣으면 파일명에 브랜드가 두 번 들어간다.
 */
export function reportTitleWithBrand(brandName, ...parts) {
  return [brandName, ...parts]
    .map(part => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
}
