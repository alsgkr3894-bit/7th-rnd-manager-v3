import { describe, expect, test } from '@jest/globals';
import { closestElement, getTiltTransform } from '../../hooks/useVisualEffects.js';

describe('closestElement', () => {
  test('closest를 가진 이벤트 대상은 직접 탐색한다', () => {
    const found = { className: 'btn' };
    const target = { closest: selector => (selector === '.btn' ? found : null) };

    expect(closestElement(target, '.btn')).toBe(found);
  });

  test('closest가 없는 대상은 parentElement에서 탐색한다', () => {
    const found = { className: 'card-lift' };
    const target = {
      parentElement: {
        closest: selector => (selector === '.card-lift' ? found : null),
      },
    };

    expect(closestElement(target, '.card-lift')).toBe(found);
  });

  test('비정상 대상은 null로 처리한다', () => {
    expect(closestElement(null, '.btn')).toBeNull();
    expect(closestElement({}, '.btn')).toBeNull();
    expect(closestElement({ closest: null }, '')).toBeNull();
  });
});

describe('getTiltTransform', () => {
  test('유효한 카드 크기면 tilt transform을 만든다', () => {
    expect(getTiltTransform(75, 25, {
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    })).toContain('perspective(600px)');
  });

  test('카드 크기나 좌표가 비정상이면 transform을 만들지 않는다', () => {
    expect(getTiltTransform(10, 10, { left: 0, top: 0, width: 0, height: 100 })).toBe('');
    expect(getTiltTransform(Infinity, 10, { left: 0, top: 0, width: 100, height: 100 })).toBe('');
    expect(getTiltTransform(10, 10, null)).toBe('');
  });
});
