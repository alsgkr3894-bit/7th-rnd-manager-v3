/**
 * 디자인 토큰 색 대비 (Lighthouse 접근성 지적, 2026-09-29).
 * --negative가 #e03131이던 때 연회색(surface-2) 위 글자가 4.25:1, 연빨강(negative-soft)
 * 위 글자가 3.89:1로 WCAG AA(일반 글자 4.5:1)에 못 미쳤다("초기화" 버튼 등).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const css = readFileSync(resolve('app/styles/tokens.css'), 'utf8');
const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf("[data-theme='dark']"));

function token(name) {
  // 역슬래시 이스케이프 없이: "--이름:" 뒤의 첫 #RRGGBB
  const start = lightBlock.indexOf(`--${name}:`);
  const hex = start === -1 ? null : lightBlock.slice(start).match(/#[0-9a-fA-F]{6}/);
  if (!hex) throw new Error(`--${name} 토큰을 못 찾음`);
  return hex[0];
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('--negative(빨강 글자)의 색 대비', () => {
  test.each(['surface', 'surface-2', 'surface-3', 'negative-soft'])(
    '%s 배경 위에서 WCAG AA(4.5:1) 이상',
    bg => {
      expect(contrast(token('negative'), token(bg))).toBeGreaterThanOrEqual(4.5);
    }
  );

  test('흰 글자를 얹는 빨강 배경(버튼)에서도 AA', () => {
    expect(contrast('#ffffff', token('negative'))).toBeGreaterThanOrEqual(4.5);
  });

  test('계산이 맞는지 — 옛 값 #e03131은 연회색 위에서 실제로 미달이었다', () => {
    expect(contrast('#e03131', token('surface-2'))).toBeLessThan(4.5);
  });
});

// 2026-09-29 색 대비 2차: 초록·주황·가장 옅은 글자색(text-4)도 연회색 배경 위에서 AA에 못 미쳤다.
describe('--positive / --warn / --text-4(라이트)의 색 대비', () => {
  test.each(['surface', 'surface-2', 'surface-3', 'bg', 'positive-soft'])(
    '--positive는 %s 위에서 WCAG AA(4.5:1) 이상',
    bg => {
      expect(contrast(token('positive'), token(bg))).toBeGreaterThanOrEqual(4.5);
    }
  );

  test.each(['surface', 'surface-2', 'surface-3', 'bg', 'warn-soft'])(
    '--warn은 %s 위에서 WCAG AA(4.5:1) 이상',
    bg => {
      expect(contrast(token('warn'), token(bg))).toBeGreaterThanOrEqual(4.5);
    }
  );

  test.each(['surface', 'surface-2', 'surface-3', 'bg'])(
    '--text-4는 %s 위에서 WCAG AA(4.5:1) 이상',
    bg => {
      expect(contrast(token('text-4'), token(bg))).toBeGreaterThanOrEqual(4.5);
    }
  );

  test('흰 글자를 얹는 초록·주황 배경(토스트 아이콘·버튼)도 AA', () => {
    expect(contrast('#ffffff', token('positive'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', token('warn'))).toBeGreaterThanOrEqual(4.5);
  });

  test('계산이 맞는지 — 옛 값들은 실제로 미달이었다', () => {
    expect(contrast('#1a8917', token('surface-2'))).toBeLessThan(4.5);
    expect(contrast('#c76a00', token('surface'))).toBeLessThan(4.5);
    expect(contrast('#767676', token('surface-2'))).toBeLessThan(4.5);
  });
});

describe('다크 모드 --text-4', () => {
  const dark = css.slice(css.indexOf("[data-theme='dark']"));
  const hexOf = name => {
    const start = dark.indexOf(`--${name}:`);
    return dark.slice(start).match(/#[0-9a-fA-F]{6}/)[0];
  };

  test.each(['surface', 'surface-2', 'surface-3', 'bg'])('%s 위에서 AA', bg => {
    expect(contrast(hexOf('text-4'), hexOf(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
