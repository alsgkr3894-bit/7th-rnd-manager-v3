/**
 * lib/print/window-print.js — 팝업 기반 인쇄 창 공통 헬퍼
 *
 * window.open + document.write + 팝업 차단 안내를 한 곳에서 관리한다.
 * 실제 HTML 콘텐츠(title, style, body)는 호출 측에서 구성한다.
 */
export function buildAutoPrintScript({ waitForImages = false, closeAfterPrint = true } = {}) {
  const closeLine = closeAfterPrint ? 'window.onafterprint = function() { window.close(); };' : '';
  if (!waitForImages) {
    return `<script>window.onload = function() { window.focus(); window.print(); }; ${closeLine}<\\/script>`;
  }

  return `<script>
window.onload = function() {
  var images = Array.prototype.slice.call(document.images || []);
  var waits = images.map(function(img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function(resolve) {
      img.onload = resolve;
      img.onerror = resolve;
    });
  });
  Promise.all(waits).then(function() {
    requestAnimationFrame(function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 120);
    });
  });
};
${closeLine}
<\\/script>`;
}

/**
 * 새 팝업 창에 HTML을 쓰고 인쇄 대화상자를 띄운다.
 * HTML 내부에 buildAutoPrintScript() 결과를 포함시키면 자동 인쇄된다.
 *
 * @param {string} html - 완전한 HTML 문자열
 * @param {{ width?: number, height?: number }} [opts]
 * @returns {boolean} 팝업 차단 시 false, 성공 시 true
 */
export function openPrintWindow(html, { width = 900, height = 1000 } = {}) {
  const win = window.open('', '_blank', `width=${width},height=${height}`);
  if (!win) {
    import('@/components/Toast')
      .then(({ showToast }) => showToast('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.', 'warn'))
      .catch(() => {});
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
