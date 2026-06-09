import { describe, expect, test } from '@jest/globals';
import { normalizeBeforeUnloadMessage } from '../../hooks/useBeforeUnload.js';

describe('normalizeBeforeUnloadMessage', () => {
  test('문자열과 숫자는 beforeunload 표시 문자열로 보존한다', () => {
    expect(normalizeBeforeUnloadMessage('저장 전입니다')).toBe('저장 전입니다');
    expect(normalizeBeforeUnloadMessage(7)).toBe('7');
  });

  test('객체/null 같은 비정상 값은 fallback으로 복구한다', () => {
    expect(normalizeBeforeUnloadMessage(null, '기본')).toBe('기본');
    expect(normalizeBeforeUnloadMessage({ message: 'bad' }, '기본')).toBe('기본');
  });
});
