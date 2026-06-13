import { describe, expect, test } from '@jest/globals';
import { isOutsideClickTarget } from '../../hooks/useOutsideClick.js';

function makeNode() {
  const children = new Set();
  const node = {
    append(child) {
      children.add(child);
      return child;
    },
    contains(target) {
      return target === node || children.has(target);
    },
  };
  return node;
}

describe('isOutsideClickTarget', () => {
  test('ref 내부 target은 outside-click으로 보지 않는다', () => {
    const root = makeNode();
    const child = root.append({});

    expect(isOutsideClickTarget(root, [{ current: root }])).toBe(false);
    expect(isOutsideClickTarget(child, [{ current: root }])).toBe(false);
  });

  test('모든 ref 바깥 target만 outside-click으로 본다', () => {
    const root = makeNode();
    const other = makeNode();
    const outside = {};

    expect(isOutsideClickTarget(outside, [{ current: root }, { current: other }])).toBe(true);
  });

  test('target이 없으면 outside-click 콜백을 호출하지 않는다', () => {
    expect(isOutsideClickTarget(null, [{ current: makeNode() }])).toBe(false);
  });
});
