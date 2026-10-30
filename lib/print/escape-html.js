/**
 * lib/print/escape-html.js — 출력(PDF) HTML에 값을 끼워 넣을 때 쓰는 공통 이스케이프
 *
 * 인쇄 창은 앱과 같은 출처(same-origin)의 팝업이라, 거기에 스크립트가 들어가면 IndexedDB·localStorage가
 * 그대로 열린다. 엑셀·사용자 입력에서 온 값이 HTML이나 속성값(" ')을 깨지 못하도록 5개 문자를 모두 바꾼다.
 * (예전엔 출력마다 따로 만든 helper가 8개였고 일부는 " 를, 전부 ' 를 처리하지 않았다.)
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
