import { computeFileHash } from '../../lib/excel.js';

/** arrayBuffer()만 제공하는 최소 File 모킹 */
function fakeFile(text) {
  const bytes = new TextEncoder().encode(text);
  return { arrayBuffer: async () => bytes.buffer };
}

describe('computeFileHash — crypto.subtle 폴백', () => {
  const original = globalThis.crypto;

  afterEach(() => {
    // 원복 (configurable일 때만)
    try { globalThis.crypto = original; } catch { /* noop */ }
  });

  test('crypto.subtle이 없는 비보안 컨텍스트에서도 해시를 반환한다', async () => {
    try { globalThis.crypto = {}; } catch { return; } // 덮어쓰기 불가 환경은 skip
    const hash = await computeFileHash(fakeFile('hello world'));
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    expect(hash.startsWith('f')).toBe(true); // 폴백 해시 접두사
  });

  test('같은 내용은 같은 해시, 다른 내용은 다른 해시 (폴백)', async () => {
    try { globalThis.crypto = {}; } catch { return; }
    const a1 = await computeFileHash(fakeFile('동일한 출고 파일 내용'));
    const a2 = await computeFileHash(fakeFile('동일한 출고 파일 내용'));
    const b  = await computeFileHash(fakeFile('다른 출고 파일 내용'));
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });
});
