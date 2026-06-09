import { describe, expect, test } from '@jest/globals';
import {
  DEFAULT_MODAL_FRAME_STYLE,
  normalizeModalFrameStyle,
  normalizeModalStyleLength,
} from '../../lib/ui/modal-frame.js';

describe('modal frame ui helpers', () => {
  test('style length는 기존처럼 문자열과 숫자만 허용한다', () => {
    expect(normalizeModalStyleLength('min(480px,95vw)', 'fallback')).toBe('min(480px,95vw)');
    expect(normalizeModalStyleLength(320, 'fallback')).toBe(320);
    expect(normalizeModalStyleLength(null, 'fallback')).toBe('fallback');
    expect(normalizeModalStyleLength({ width: 320 }, 'fallback')).toBe('fallback');
  });

  test('모달 스타일 기본값은 기존 표시값을 유지한다', () => {
    expect(normalizeModalFrameStyle()).toEqual(DEFAULT_MODAL_FRAME_STYLE);
  });

  test('잘못된 모달 스타일 입력은 항목별 기본값으로 복구한다', () => {
    expect(normalizeModalFrameStyle({
      width: ['bad'],
      zIndex: 300,
      padding: null,
      maxHeight: '80vh',
    })).toEqual({
      width: DEFAULT_MODAL_FRAME_STYLE.width,
      zIndex: 300,
      padding: DEFAULT_MODAL_FRAME_STYLE.padding,
      maxHeight: '80vh',
    });
  });
});
