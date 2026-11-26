/**
 * lib/db/sync-outbox.js — 서버가 아직 확인하지 않은 동기화 작업의 보관함.
 *
 * 전송 큐가 메모리에만 있으면, 서버(또는 PostgreSQL)가 내려간 사이에 탭을 닫거나 PC를 다시
 * 켜면 그 변경이 서버에 영영 가지 않는다. 앱 DB와 별도의 DB에 두어 앱 스키마 버전을 올리지
 * 않는다. IndexedDB를 쓸 수 없는 환경에서는 메모리 보관으로 대신한다.
 */
import { openAuxiliaryDB } from './init';

const DB_NAME = 'rnd_sync_outbox';
const DB_VERSION = 1;
const OPERATIONS = 'operations';
const DEAD_LETTERS = 'dead_letters';

// 한꺼번에 대기열에 넣는 요청 수(lib/db/backup.js와 같은 크기)
const WRITE_CHUNK_SIZE = 500;

const bySendOrder = (a, b) => a.queuedAt - b.queuedAt || a.seq - b.seq;

function upgrade(db) {
  if (!db.objectStoreNames.contains(OPERATIONS)) {
    db.createObjectStore(OPERATIONS, { keyPath: 'opId' });
  }
  if (!db.objectStoreNames.contains(DEAD_LETTERS)) {
    db.createObjectStore(DEAD_LETTERS, { autoIncrement: true });
  }
}

async function run(storeName, mode, work) {
  const db = await openAuxiliaryDB(DB_NAME, DB_VERSION, upgrade);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = work(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error || new Error('outbox transaction error'));
    tx.onabort = () => reject(tx.error || new Error('outbox transaction aborted'));
  });
}

export function createIndexedDbOutbox() {
  return {
    // 한 번에 받은 묶음은 한 트랜잭션이다 — 일부만 남으면 '전체 비우기'만 서버에 가고 이어지는
    // 행이 빠진다. 요청은 500건씩 이어 넣어, 중간에 새로고침해도 곧바로 취소되게 한다.
    add: entries =>
      run(OPERATIONS, 'readwrite', store => {
        let next = 0;
        const queueChunk = () => {
          const end = Math.min(next + WRITE_CHUNK_SIZE, entries.length);
          let last = null;
          for (; next < end; next += 1) last = store.put(entries[next]);
          if (last && next < entries.length) last.onsuccess = queueChunk;
        };
        queueChunk();
      }),
    remove: opIds =>
      run(OPERATIONS, 'readwrite', store => {
        for (const opId of opIds) store.delete(opId);
      }),
    list: async () =>
      [...((await run(OPERATIONS, 'readonly', store => store.getAll())) || [])].sort(bySendOrder),
    addDeadLetter: entry => run(DEAD_LETTERS, 'readwrite', store => store.add(entry)),
    listDeadLetters: async () =>
      (await run(DEAD_LETTERS, 'readonly', store => store.getAll())) || [],
    clearDeadLetters: () => run(DEAD_LETTERS, 'readwrite', store => store.clear()),
  };
}

export function createMemoryOutbox() {
  const operations = new Map();
  let deadLetters = [];
  return {
    async add(entries) {
      for (const entry of entries) operations.set(entry.opId, entry);
    },
    async remove(opIds) {
      for (const opId of opIds) operations.delete(opId);
    },
    async list() {
      return [...operations.values()].sort(bySendOrder);
    },
    async addDeadLetter(entry) {
      deadLetters.push(entry);
    },
    async listDeadLetters() {
      return [...deadLetters];
    },
    async clearDeadLetters() {
      deadLetters = [];
    },
  };
}

let current = null;

export function getSyncOutbox() {
  if (!current) {
    current = typeof indexedDB === 'undefined' ? createMemoryOutbox() : createIndexedDbOutbox();
  }
  return current;
}

/** 테스트에서 '다시 켠 브라우저'를 흉내 낼 때 보관함을 바꿔 끼운다. */
export function setSyncOutbox(outbox) {
  current = outbox;
}
