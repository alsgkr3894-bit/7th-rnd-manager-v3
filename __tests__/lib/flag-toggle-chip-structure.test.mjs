import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = readFileSync(resolve('components/sales/FlagToggleChip.jsx'), 'utf8');

describe('FlagToggleChip — 순위표 미등록/단종 토글 칩', () => {
  test('화면 전용 체크박스 칩이다(인쇄에서는 배지가 대신한다)', () => {
    expect(src).toContain('export function FlagToggleChip');
    expect(src).toContain('chip no-print flag-toggle-chip');
    expect(src).toContain('type="checkbox"');
    expect(src).toContain('checked={isOn}');
    expect(src).toContain('disabled={disabled}');
  });

  test('전역 .chip/checkbox 크기(min-height 36px, checkbox 24px)를 인라인으로 눌러 행 안에 맞춘다', () => {
    expect(src).toContain('minHeight: 0');
    expect(src).toContain('width: 14, height: 14, minWidth: 14, minHeight: 14');
  });

  test('단종 칩은 warn 톤으로 비정규메뉴 배지 색과 맞춘다', () => {
    expect(src).toContain("tone === 'warn' ? 'var(--warn)'");
    expect(src).toContain("tone === 'warn' ? 'var(--warn-soft)'");
  });
});
