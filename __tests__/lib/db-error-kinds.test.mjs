import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { classifyDbError, DB_ERROR_MESSAGES } from '../../lib/db/errors.js';

const originalIndexedDB = globalThis.indexedDB;
const originalWindow = globalThis.window;
const originalCustomEvent = globalThis.CustomEvent;

afterEach(() => {
  globalThis.indexedDB = originalIndexedDB;
  globalThis.window = originalWindow;
  globalThis.CustomEvent = originalCustomEvent;
  jest.restoreAllMocks();
});

describe('저장소 오류 구분', () => {
  test.each([
    ['QuotaExceededError', 'quota'],
    ['VersionError', 'newer'],
    ['UnknownError', 'storage'],
    ['DbBlockedError', 'blocked'],
    ['ConstraintError', null],
    ['AbortError', null],
  ])('%s → %s', (name, kind) => {
    expect(classifyDbError({ name })).toBe(kind);
    if (kind) expect(DB_ERROR_MESSAGES[kind]).toBeTruthy();
  });

  test('어느 안내도 데이터를 지우라고 하지 않는다', () => {
    for (const message of Object.values(DB_ERROR_MESSAGES)) {
      expect(message).not.toMatch(/(?<!지)(?<!우지)삭제하세요|초기화하세요|데이터를 지우세요/);
    }
  });
});

describe('업그레이드가 막힌 DB', () => {
  test('호출자는 바로 실패를 받고, 다른 탭이 닫히면 새 요청 없이 이어서 열린다', async () => {
    const events = [];
    const requests = [];
    globalThis.window = { dispatchEvent: event => events.push(event.type) };
    globalThis.CustomEvent = class {
      constructor(type) {
        this.type = type;
      }
    };
    globalThis.indexedDB = {
      open: () => {
        const request = {};
        requests.push(request);
        queueMicrotask(() => request.onblocked?.());
        return request;
      },
    };
    jest.unstable_mockModule('../../lib/db/startup-snapshot.js', () => ({
      recordStartupRows: () => {},
    }));
    const { openNamed, getNamed } = await import('../../lib/db/init.js');

    await expect(openNamed('blocked-db')).rejects.toMatchObject({ name: 'DbBlockedError' });
    await expect(openNamed('blocked-db')).rejects.toMatchObject({ name: 'DbBlockedError' });
    expect(requests).toHaveLength(1);

    const db = { close: () => {}, objectStoreNames: { contains: () => false } };
    requests[0].onsuccess({ target: { result: db } });

    expect(getNamed('blocked-db')).toBe(db);
    await expect(openNamed('blocked-db')).resolves.toBe(db);
    expect(events).toEqual(['db:blocked', 'db:unblocked']);

    events.length = 0;
    db.onabort({ target: { error: { name: 'QuotaExceededError' } } });
    expect(events).toEqual(['db:error']);
  });
});
