/**
 * 점검 3단계: 바뀌지 않은 저장소는 다시 읽지 않고, 어떤 경로로 쓰든(다른 탭 포함) 다음 조회는
 * 새 값을 읽는다. 오래된 값을 돌려주면 원가·표시가 틀리므로 무효화를 경로별로 확인한다.
 */
import { afterEach, describe, expect, test } from '@jest/globals';
import { copyRows, MAX_CACHED_ROWS, readAllRows } from '../../lib/db/read-cache.js';
import { onStoresChanged, trackWrites } from '../../lib/db/revision.js';

let dbCounter = 0;

function fakeDb() {
  dbCounter += 1;
  const data = new Map();
  const reads = [];
  const db = {
    name: `cache-test-${dbCounter}`,
    transaction(storeNames, mode = 'readonly') {
      const tx = new EventTarget();
      tx.mode = mode;
      tx.objectStore = name => ({
        getAll() {
          reads.push(name);
          const request = { result: undefined };
          const snapshot = copyRows(data.get(name) || []);
          queueMicrotask(() => {
            request.result = snapshot;
            request.onsuccess();
          });
          return request;
        },
      });
      return tx;
    },
  };
  const write = (store, rows, outcome = 'complete') => {
    const tx = db.transaction([store], 'readwrite');
    if (outcome === 'complete') data.set(store, rows);
    tx.dispatchEvent(new Event(outcome));
  };
  return { db, data, reads, write };
}

const tracked = () => {
  const fake = fakeDb();
  trackWrites(fake.db, fake.db.name);
  return fake;
};

const channels = [];
afterEach(() => channels.splice(0).forEach(channel => channel.close()));

describe('조회 보관', () => {
  test('바뀌지 않은 저장소는 한 번만 읽고, 받은 값을 고쳐도 보관본은 그대로다', async () => {
    const { db, data, reads } = tracked();
    data.set('menu_master', [{ id: 2, tags: ['a'] }, { id: 1 }]);

    const first = await readAllRows(db, 'menu_master');
    first.sort((a, b) => a.id - b.id);
    first[1].tags.push('b');
    first[0].extra = true;
    const second = await readAllRows(db, 'menu_master');

    expect(reads).toEqual(['menu_master']);
    expect(second).toEqual([{ id: 2, tags: ['a'] }, { id: 1 }]);
    expect(second).not.toBe(first);
  });

  test('동시에 요청해도 한 번만 읽고 서로 다른 사본을 받는다', async () => {
    const { db, data, reads } = tracked();
    data.set('price_rows', [{ id: 1 }]);

    const [a, b] = await Promise.all([
      readAllRows(db, 'price_rows'),
      readAllRows(db, 'price_rows'),
    ]);

    expect(reads).toHaveLength(1);
    expect(a[0]).not.toBe(b[0]);
  });

  test.each(['complete', 'abort'])('쓰기가 끝나면(%s) 다음 조회는 다시 읽는다', async outcome => {
    const { db, data, reads, write } = tracked();
    data.set('cost_ingredients', [{ id: 1, name: '옛' }]);
    await readAllRows(db, 'cost_ingredients');

    write('cost_ingredients', [{ id: 1, name: '새' }], outcome);
    const rows = await readAllRows(db, 'cost_ingredients');

    expect(reads).toHaveLength(2);
    expect(rows[0].name).toBe(outcome === 'complete' ? '새' : '옛');
  });

  test('보관하지 않는 저장소도 동시에 읽은 쪽끼리 값을 공유하지 않는다', async () => {
    const { db, data, reads } = tracked();
    data.set('menu_dev_notes', [{ id: 1, photos: ['a'] }]);

    const [a, b] = await Promise.all([
      readAllRows(db, 'menu_dev_notes'),
      readAllRows(db, 'menu_dev_notes'),
    ]);
    a[0].photos.push('b');

    expect(reads).toHaveLength(1);
    expect(b[0].photos).toEqual(['a']);
  });

  test('다른 저장소의 쓰기는 보관본을 버리지 않는다', async () => {
    const { db, reads, write } = tracked();
    await readAllRows(db, 'menu_master');
    write('price_rows', []);
    await readAllRows(db, 'menu_master');

    expect(reads).toEqual(['menu_master']);
  });

  test('쓰는 중에 읽은 값은 보관하지 않는다', async () => {
    const { db, data, reads } = tracked();
    const tx = db.transaction(['menu_master'], 'readwrite');
    await readAllRows(db, 'menu_master');
    data.set('menu_master', [{ id: 9 }]);
    tx.dispatchEvent(new Event('complete'));

    await expect(readAllRows(db, 'menu_master')).resolves.toEqual([{ id: 9 }]);
    expect(reads).toHaveLength(2);
  });

  test('읽는 도중 쓰기가 끝나면 그 결과를 다음 조회에 쓰지 않는다', async () => {
    const { db, data, reads, write } = tracked();
    const early = readAllRows(db, 'menu_master');
    write('menu_master', [{ id: 5 }]);
    const late = readAllRows(db, 'menu_master');

    await expect(early).resolves.toEqual([]);
    await expect(late).resolves.toEqual(data.get('menu_master'));
    expect(reads).toHaveLength(2);
  });

  test('큰 저장소와 사진 저장소, 추적하지 않는 연결은 매번 읽는다', async () => {
    const { db, data, reads } = tracked();
    data.set(
      'sales_rows',
      Array.from({ length: MAX_CACHED_ROWS + 1 }, (_, id) => ({ id }))
    );
    for (const store of ['shipment_rows', 'menu_dev_notes', 'sales_rows']) {
      await readAllRows(db, store);
      await readAllRows(db, store);
    }
    expect(reads).toHaveLength(6);

    const plain = fakeDb();
    await readAllRows(plain.db, 'menu_master');
    await readAllRows(plain.db, 'menu_master');
    expect(plain.reads).toHaveLength(2);
  });

  test('다른 탭의 변경 알림을 받으면 다시 읽는다', async () => {
    const { db, data, reads } = tracked();
    await readAllRows(db, 'menu_master');
    const changed = new Promise(resolve => {
      const off = onStoresChanged(event => {
        off();
        resolve(event);
      });
    });
    const other = new BroadcastChannel('rnd-store-revision');
    channels.push(other);
    data.set('menu_master', [{ id: 3 }]);
    other.postMessage({ dbName: db.name, stores: ['menu_master'] });

    await expect(changed).resolves.toEqual({ dbName: db.name, stores: ['menu_master'] });
    await expect(readAllRows(db, 'menu_master')).resolves.toEqual([{ id: 3 }]);
    expect(reads).toHaveLength(2);
  });

  test('사본은 날짜·Blob을 바꾸지 않는다', () => {
    const at = new Date(0);
    const copy = copyRows([{ at, nested: { list: [1] } }]);
    expect(copy[0].at).toBe(at);
    expect(copy[0].nested).toEqual({ list: [1] });
  });
});
