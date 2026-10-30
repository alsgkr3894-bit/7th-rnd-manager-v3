import { describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createPriceEventHub } from '../../lib/price/price-events.js';

// 2026-10-30: 식자재관리 탭에서 단가를 바꿔도 다른 탭의 메뉴마스터·보고서가 새로고침 전까지 옛 원가를
// 보여주던 것 — 같은 브라우저의 다른 탭에도 BroadcastChannel로 알린다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// 같은 이름 채널끼리 서로 메시지를 전달하되 자기 자신에게는 보내지 않는 BroadcastChannel 모형
function makeChannelCtor() {
  const all = new Set();
  return class FakeChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      all.add(this);
    }
    postMessage(data) {
      for (const other of all) {
        if (other !== this && other.name === this.name) other.onmessage?.({ data });
      }
    }
  };
}

describe('단가 변경 알림 허브', () => {
  test('같은 탭 구독자에게 한 번씩 전달하고, 구독 해제가 된다', () => {
    const hub = createPriceEventHub(null);
    const fn = jest.fn();
    const off = hub.on(fn);
    hub.emit();
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    hub.emit();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('채널이 없는 환경에서도 오류 없이 동작한다', () => {
    const hub = createPriceEventHub(undefined);
    expect(() => hub.emit()).not.toThrow();
    expect(() => hub.on('bad')()).not.toThrow();
  });

  test('다른 탭의 알림을 받으면 이 탭 구독자가 실행되고, 보낸 탭은 중복 실행되지 않는다', () => {
    const Ctor = makeChannelCtor();
    const tabA = createPriceEventHub(Ctor);
    const tabB = createPriceEventHub(Ctor);
    const a = jest.fn();
    const b = jest.fn();
    tabA.on(a);
    tabB.on(b);

    tabA.emit();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    tabB.emit();
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
  });

  test('받은 알림을 다시 방송하지 않는다(무한 반복 방지)', () => {
    const Ctor = makeChannelCtor();
    const tabA = createPriceEventHub(Ctor);
    const tabB = createPriceEventHub(Ctor);
    const tabC = createPriceEventHub(Ctor);
    const c = jest.fn();
    tabA.on(() => {});
    tabB.on(() => {});
    tabC.on(c);
    tabA.emit();
    expect(c).toHaveBeenCalledTimes(1);
  });

  test('한 구독자가 실패해도 나머지는 실행된다', () => {
    const hub = createPriceEventHub(null);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const ok = jest.fn();
    hub.on(() => {
      throw new Error('boom');
    });
    hub.on(ok);
    hub.emit();
    expect(ok).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('단가 변경을 알리는 곳 / 구독하는 곳', () => {
  test('식자재 삭제·단종·복원·초기화·대체도 알림을 보낸다', () => {
    const destructive = read('lib/ingredient/destructive.js');
    for (const fn of [
      'excludeIngredientByCode',
      'restoreIngredientByCode',
      'deleteIngredient',
      'bulkSetDiscontinued',
      'resetAllIngredients',
    ]) {
      const start = destructive.indexOf(`export async function ${fn}`);
      expect(start).toBeGreaterThan(-1);
      const next = destructive.indexOf('\nexport ', start + 10);
      expect(destructive.slice(start, next < 0 ? undefined : next)).toContain('emitPriceChange()');
    }
    expect(read('lib/ingredient/product-replace.js')).toContain('emitPriceChange()');
  });

  test('원가 보고서·가격 보고서 페이지가 단가 변경을 구독한다', () => {
    expect(read('app/report/cost/page.jsx')).toContain('onPriceChange(reload)');
    expect(read('app/report/price/page.jsx')).toContain('onPriceChange(reload)');
  });
});
