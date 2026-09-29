import { describe, expect, test } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';

// 2026-09-29 성능 점검: 2MB짜리 PretendardVariable.woff2가 첫 화면 전송량의 85%였다.
// 글자 조각(unicode-range)으로 나누되, 한글 11,172자가 하나도 빠지면 안 된다
// ('쌤' 같은 글자가 KS X 1001 밖에 있어 2,350자 서브셋은 쓸 수 없다).
const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8').split('\r\n').join('\n');
const css = read('app/fonts/pretendard.css');

function parseFaces() {
  const faces = [];
  for (const block of css.split('@font-face {').slice(1)) {
    const file = block.split("url('./")[1].split("'")[0];
    const rangeText = block.split('unicode-range:')[1].split(';')[0];
    const codes = new Set();
    for (const part of rangeText.split(',')) {
      const [a, b] = part.trim().slice(2).split('-');
      const from = parseInt(a, 16);
      const to = b ? parseInt(b, 16) : from;
      for (let c = from; c <= to; c++) codes.add(c);
    }
    faces.push({ file, codes, block });
  }
  return faces;
}

describe('Pretendard 글자 조각', () => {
  const faces = parseFaces();

  test('조각 8개, 파일이 모두 존재하고 서빙되지 않는 원본은 fonts-src에 있다', () => {
    expect(faces).toHaveLength(8);
    for (const f of faces) expect(existsSync(new URL(`app/fonts/${f.file}`, root))).toBe(true);
    expect(existsSync(new URL('fonts-src/PretendardVariable.woff2', root))).toBe(true);
    expect(existsSync(new URL('public/fonts/PretendardVariable.woff2', root))).toBe(false);
  });

  test('조각끼리 글자가 겹치지 않는다(같은 글자를 두 번 받지 않는다)', () => {
    const seen = new Set();
    for (const f of faces) {
      for (const c of f.codes) {
        expect(seen.has(c)).toBe(false);
        seen.add(c);
      }
    }
  });

  test('한글 음절 11,172자(AC00–D7A3)가 전부 어느 한 조각에 있다', () => {
    const all = new Set();
    for (const f of faces) for (const c of f.codes) all.add(c);
    let missing = 0;
    for (let c = 0xac00; c <= 0xd7a3; c++) if (!all.has(c)) missing++;
    expect(missing).toBe(0);
    // 대표적으로 KS X 1001 밖의 '쌤'(U+C308)·마지막 음절 '힣'(U+D7A3), 그리고 원화 기호·기본 라틴
    for (const c of [0xc308, 0xd7a3, 0x20a9, 0x41, 0x31]) expect(all.has(c)).toBe(true);
  });

  test('첫 화면용 조각(latin·h1)은 작게 유지한다', () => {
    const size = name => readFileSync(new URL(`app/fonts/pretendard-${name}.woff2`, root)).length;
    expect(size('latin') + size('h1')).toBeLessThan(400 * 1024);
  });

  test('모든 조각은 swap·가변 굵기이고, --font-pretendard가 조각 family를 가리킨다', () => {
    for (const f of faces) {
      expect(f.block).toContain('font-display: swap');
      expect(f.block).toContain('font-weight: 100 900');
      expect(f.block).toContain("font-family: 'Pretendard Slice'");
    }
    expect(css).toContain("--font-pretendard: 'Pretendard Slice'");
  });

  test('레이아웃은 조각 CSS를 import하고 통짜 폰트를 더 쓰지 않는다', () => {
    const layout = read('app/layout.jsx');
    expect(layout).toContain("import './fonts/pretendard.css'");
    expect(layout).not.toContain('next/font/local');
    expect(layout).not.toContain('PretendardVariable.woff2');
  });
});
