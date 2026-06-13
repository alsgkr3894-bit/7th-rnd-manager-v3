import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { copyText } from '../../lib/ui/clipboard.js';
import { buildAutoPrintScript } from '../../lib/print/window-print.js';

const originalNavigator = globalThis.navigator;

function setNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setNavigator(originalNavigator);
});

describe('browser helper guards', () => {
  test('copyText returns false when clipboard is unavailable', async () => {
    setNavigator({});
    expect(await copyText('hello')).toBe(false);
  });

  test('copyText returns true when clipboard write succeeds', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText } });

    expect(await copyText('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  test('copyText returns false when clipboard write fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    setNavigator({ clipboard: { writeText } });

    expect(await copyText('hello')).toBe(false);
  });

  test('buildAutoPrintScript can include image waiting and close behavior', () => {
    const html = buildAutoPrintScript({ waitForImages: true });
    expect(html).toContain('document.images');
    expect(html).toContain('window.print()');
    expect(html).toContain('window.onafterprint');
  });

  test('buildAutoPrintScript can skip closeAfterPrint', () => {
    const html = buildAutoPrintScript({ closeAfterPrint: false });
    expect(html).toContain('window.print()');
    expect(html).not.toContain('window.onafterprint');
  });
});
