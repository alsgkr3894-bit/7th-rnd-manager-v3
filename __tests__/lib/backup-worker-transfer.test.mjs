/**
 * 점검 4단계: 백업은 별도 스레드에서 읽어 나눠 받는다. 취소·시간 초과에도 스레드를 끝낸다.
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { backupMessages, createBackupReceiver } from '../../lib/backup/transfer.js';
import { BACKUP_LIMITS, createBackupBlob, parseBackupBlob } from '../../lib/backup/file-format.js';
import { runInWorker } from '../../lib/worker/run-in-worker.js';

const original = globalThis.Worker;
afterEach(() => {
  globalThis.Worker = original;
  jest.useRealTimers();
});

const sample = () => ({
  version: 'v3',
  exportedAt: '2026-11-26T00:00:00.000Z',
  stores: {
    menu_master: Array.from({ length: 4500 }, (_, id) => ({ id, name: `메뉴 ${id}` })),
    menu_dev_notes: [1, 2, 3].map(id => ({ id, photos: [{ data: 'a'.repeat(3_000_000) }] })),
    settings: [],
  },
});

describe('나눠 넘기기', () => {
  test('묶음으로 받아 다시 만든 값이 원본과 같고, 보낸 행은 놓아 준다', () => {
    const data = sample();
    const receiver = createBackupReceiver();
    const sizes = [];
    let whole;
    for (const message of backupMessages(data)) {
      if (message.type === 'done') whole = message.result;
      else {
        receiver.accept(structuredClone(message));
        if (message.rows) sizes.push([message.store, message.rows.length]);
      }
    }

    expect(receiver.result(whole)).toEqual(sample());
    expect(sizes).toEqual([
      ['menu_master', 2000],
      ['menu_master', 2000],
      ['menu_master', 500],
      ['menu_dev_notes', 2],
      ['menu_dev_notes', 1],
      ['settings', 0],
    ]);
    expect(data.stores).toEqual({});
  });

  test.each([null, [], { stores: 'x' }])('형식이 다른 값(%p)은 그대로 넘긴다', value => {
    const messages = [...backupMessages(value)];
    expect(messages).toEqual([{ type: 'done', result: value }]);
  });

  test('__proto__ 저장소 이름이 객체 원형을 바꾸지 않는다', () => {
    const receiver = createBackupReceiver();
    receiver.accept({ type: 'chunk', store: '__proto__', rows: [{ polluted: true }] });
    const { stores } = receiver.result();
    expect(Object.getPrototypeOf(stores)).toBe(Object.prototype);
    expect(Object.keys(stores)).toEqual(['__proto__']);
  });
});

describe('백업 상한', () => {
  const deep = levels => (levels === 0 ? 1 : { next: deep(levels - 1) });

  test.each([
    ['저장소 수', { stores: 1 }, { a: [], b: [] }, '저장소가 너무 많습니다'],
    ['행 수', { rows: 2 }, { a: [{}, {}], b: [{}] }, '행이 너무 많습니다'],
    ['깊이', { depth: 5 }, { a: [deep(6)] }, '너무 깊게'],
  ])('%s — 압축 형식과 JSON 모두 거부', async (_, change, stores, message) => {
    const limits = { ...BACKUP_LIMITS, ...change };
    const compressed = await createBackupBlob({ stores });
    await expect(parseBackupBlob(compressed, limits)).rejects.toThrow(message);
    await expect(parseBackupBlob(new Blob([JSON.stringify({ stores })]), limits)).rejects.toThrow(
      message
    );
  });

  test('진행률은 100까지 늘어나기만 한다', async () => {
    const seen = [];
    await parseBackupBlob(await createBackupBlob(sample()), BACKUP_LIMITS, p => seen.push(p));
    expect(seen.at(-1)).toBe(100);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});

describe('별도 스레드 실행', () => {
  function fakeWorker(behaviour) {
    const worker = {
      terminated: false,
      postMessage: message => behaviour(worker, message),
      terminate: () => {
        worker.terminated = true;
      },
    };
    return worker;
  }
  const run = (behaviour, options = {}) => {
    globalThis.Worker = function Worker() {};
    const worker = fakeWorker(behaviour);
    const promise = runInWorker({
      createWorker: () => worker,
      message: 'go',
      fallback: async () => 'fallback',
      timeoutMs: 1000,
      ...options,
    });
    return { worker, promise };
  };
  const reply = (worker, data) => queueMicrotask(() => worker.onmessage?.({ data }));

  test('결과를 받으면 스레드를 끝낸다', async () => {
    const progress = [];
    const { worker, promise } = run(
      w => {
        reply(w, { type: 'progress', value: 50 });
        reply(w, { type: 'done', result: 'ok' });
      },
      { onProgress: value => progress.push(value) }
    );
    await expect(promise).resolves.toBe('ok');
    expect(progress).toEqual([50]);
    expect(worker.terminated).toBe(true);
  });

  test.each([
    ['작업 오류', w => reply(w, { type: 'error', message: '손상' }), '손상'],
    ['스레드 중단', w => queueMicrotask(() => w.onerror({})), '중단됐습니다'],
  ])('%s', async (_, behaviour, message) => {
    const { worker, promise } = run(behaviour);
    await expect(promise).rejects.toThrow(message);
    expect(worker.terminated).toBe(true);
  });

  test('취소하면 바로 끝낸다', async () => {
    const controller = new AbortController();
    const { worker, promise } = run(() => {}, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminated).toBe(true);
  });

  test('시간이 넘으면 끝낸다', async () => {
    jest.useFakeTimers();
    const { worker, promise } = run(() => {});
    const expectation = expect(promise).rejects.toThrow('시간이 초과');
    await jest.advanceTimersByTimeAsync(1000);
    await expectation;
    expect(worker.terminated).toBe(true);
  });

  test('별도 스레드가 없는 환경에서는 같은 작업을 바로 실행한다', async () => {
    globalThis.Worker = undefined;
    await expect(runInWorker({ fallback: async () => 'fallback', timeoutMs: 1 })).resolves.toBe(
      'fallback'
    );
  });
});
