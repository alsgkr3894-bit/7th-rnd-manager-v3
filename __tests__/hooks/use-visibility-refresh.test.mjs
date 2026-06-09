import { describe, expect, jest, test } from '@jest/globals';
import {
  invokeVisibilityRefresh,
  isVisibleState,
} from '../../hooks/useVisibilityRefresh.js';

describe('useVisibilityRefresh helpers', () => {
  test('visible 상태에서만 새로고침 대상으로 판단한다', () => {
    expect(isVisibleState('visible')).toBe(true);
    expect(isVisibleState('hidden')).toBe(false);
    expect(isVisibleState(undefined)).toBe(false);
  });

  test('비함수 콜백은 실행하지 않는다', () => {
    expect(invokeVisibilityRefresh(null)).toBe(false);
    expect(invokeVisibilityRefresh('reload')).toBe(false);
  });

  test('동기 콜백 실패는 에러 핸들러로 전달한다', () => {
    const onError = jest.fn();
    const error = new Error('reload failed');

    expect(invokeVisibilityRefresh(() => { throw error; }, onError)).toBe(false);
    expect(onError).toHaveBeenCalledWith(error);
  });

  test('비동기 콜백 실패도 에러 핸들러로 전달한다', async () => {
    const onError = jest.fn();
    const error = new Error('async reload failed');

    expect(invokeVisibilityRefresh(() => Promise.reject(error), onError)).toBe(true);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(error);
  });
});
