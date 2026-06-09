import { describe, expect, test } from '@jest/globals';
import {
  getEmptyStateActionStyle,
  getEmptyStateContainerStyle,
  getEmptyStateDescriptionStyle,
  getEmptyStateIconStyle,
  getEmptyStateTitleStyle,
  normalizeEmptyStateAction,
  normalizeEmptyStateCompact,
  normalizeEmptyStateDescription,
  normalizeEmptyStateOnAction,
  normalizeEmptyStateText,
} from '../../lib/ui/empty-state.js';

describe('empty state ui helpers', () => {
  test('텍스트는 표시 가능한 값으로 보정한다', () => {
    expect(normalizeEmptyStateText('재료 없음')).toBe('재료 없음');
    expect(normalizeEmptyStateText(2026)).toBe('2026');
    expect(normalizeEmptyStateText({ title: 'bad' })).toBe('');
  });

  test('설명은 desc를 우선하고 sub를 호환 alias로 사용한다', () => {
    expect(normalizeEmptyStateDescription('설명', '보조')).toBe('설명');
    expect(normalizeEmptyStateDescription('', '보조')).toBe('보조');
    expect(normalizeEmptyStateDescription(null, '보조')).toBe('보조');
    expect(normalizeEmptyStateDescription({ desc: 'bad' }, { sub: 'bad' })).toBe('');
  });

  test('액션 라벨과 핸들러는 안전하게 보정한다', () => {
    const handler = () => 'ok';
    expect(normalizeEmptyStateAction('추가')).toBe('추가');
    expect(normalizeEmptyStateAction({ action: 'bad' })).toBe('');
    expect(normalizeEmptyStateOnAction(handler)).toBe(handler);
    expect(normalizeEmptyStateOnAction(null)).toBeUndefined();
  });

  test('compact와 컨테이너 스타일은 기존 패딩 값을 유지한다', () => {
    expect(normalizeEmptyStateCompact('yes')).toBe(true);
    expect(normalizeEmptyStateCompact(0)).toBe(false);
    expect(getEmptyStateContainerStyle(true)).toMatchObject({
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 16px',
      textAlign: 'center',
      gap: 8,
    });
    expect(getEmptyStateContainerStyle(false)).toMatchObject({
      padding: '48px 24px',
    });
  });

  test('하위 요소 스타일은 기존 표시값을 유지한다', () => {
    expect(getEmptyStateIconStyle()).toEqual({ color: 'var(--text-4)' });
    expect(getEmptyStateTitleStyle()).toEqual({ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' });
    expect(getEmptyStateDescriptionStyle()).toEqual({ fontSize: 12 });
    expect(getEmptyStateActionStyle()).toEqual({ marginTop: 8 });
  });
});
