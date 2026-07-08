/**
 * 인쇄 출력 안정성 가드 테스트 (P6 운영 안정성).
 * - 팝업 차단(window.open null) 시 조용히 실패하지 않고 false 반환 + 경고 toast
 * - 이미지 로드 실패(onerror)에도 인쇄가 진행되는 스크립트인지
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals';

const toastMock = { showToast: jest.fn() };
jest.unstable_mockModule('@/components/Toast', () => toastMock);

const { openPrintWindow, buildAutoPrintScript } = await import('../../lib/print/window-print.js');

const originalWindow = globalThis.window;
afterEach(() => {
  globalThis.window = originalWindow;
  jest.clearAllMocks();
});

describe('openPrintWindow — 팝업 차단 처리', () => {
  test('window.open이 null이면 false 반환하고 throw하지 않는다', () => {
    globalThis.window = { open: jest.fn(() => null) };
    expect(openPrintWindow('<html></html>')).toBe(false);
  });

  test('팝업 차단 시 경고 toast로 사용자에게 안내한다', async () => {
    globalThis.window = { open: jest.fn(() => null) };
    openPrintWindow('<html></html>');
    // 동적 import('@/components/Toast').then(...) 플러시
    await new Promise(r => setTimeout(r, 10));
    expect(toastMock.showToast).toHaveBeenCalledWith(expect.stringContaining('팝업'), 'warn');
  });

  test('팝업 성공 시 true 반환 + document.write(html)·close 호출', () => {
    const doc = { open: jest.fn(), write: jest.fn(), close: jest.fn() };
    globalThis.window = { open: jest.fn(() => ({ document: doc })) };
    const html = '<html>본문</html>';
    expect(openPrintWindow(html)).toBe(true);
    expect(doc.write).toHaveBeenCalledWith(html);
    expect(doc.close).toHaveBeenCalled();
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });
});

describe('buildAutoPrintScript — 이미지 로드 실패 안전', () => {
  test('waitForImages=true면 onerror도 resolve해 인쇄가 멈추지 않는다', () => {
    const script = buildAutoPrintScript({ waitForImages: true });
    expect(script).toContain('img.onerror = resolve');
    expect(script).toContain('img.decode');
    expect(script).toContain('Promise.all');
    expect(script).toContain('window.print()');
  });

  test('closeAfterPrint=false면 자동 닫기 스크립트를 넣지 않는다', () => {
    expect(buildAutoPrintScript({ closeAfterPrint: false })).not.toContain('window.close()');
    expect(buildAutoPrintScript({ closeAfterPrint: true })).toContain('window.close()');
  });
});
