import { describe, expect, test } from '@jest/globals';
import { isSaveShortcut } from '../../hooks/useKeyboardSave.js';

describe('isSaveShortcut', () => {
  test('Ctrl+S와 Cmd+S를 저장 단축키로 인식한다', () => {
    expect(isSaveShortcut({ ctrlKey: true, metaKey: false, key: 's' })).toBe(true);
    expect(isSaveShortcut({ ctrlKey: false, metaKey: true, key: 's' })).toBe(true);
  });

  test('대문자 S도 저장 단축키로 인식한다', () => {
    expect(isSaveShortcut({ ctrlKey: true, key: 'S' })).toBe(true);
  });

  test('보조키가 없거나 다른 키면 저장 단축키가 아니다', () => {
    expect(isSaveShortcut({ ctrlKey: false, metaKey: false, key: 's' })).toBe(false);
    expect(isSaveShortcut({ ctrlKey: true, key: 'x' })).toBe(false);
  });

  test('비정상 이벤트 객체는 안전하게 무시한다', () => {
    expect(isSaveShortcut(null)).toBe(false);
    expect(isSaveShortcut('bad')).toBe(false);
    expect(isSaveShortcut({ ctrlKey: true })).toBe(false);
  });
});
