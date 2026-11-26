/**
 * lib/backup/transfer.js — 별도 스레드에서 읽은 백업을 조금씩 넘겨받는다 (순수)
 *
 * 전체를 한 번에 넘기면 받는 쪽(화면)이 그동안 멈춘다. 저장소의 행을 묶음으로 나눠 보낸다.
 */
export const CHUNK_CHARS = 4 * 1024 * 1024;
const CHUNK_ROWS = 2000;

// 행의 대략적인 크기 — 복사본을 만들지 않고 글자 수만 더한다
function roughSize(value) {
  if (typeof value === 'string') return value.length;
  if (value === null || typeof value !== 'object') return 8;
  let size = 0;
  for (const key in value) size += key.length + roughSize(value[key]);
  return size;
}

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** 읽은 백업 객체 → 보낼 메시지들. 보낸 행은 원본에서 지워 메모리를 돌려준다. */
export function* backupMessages(data, chunkChars = CHUNK_CHARS) {
  if (!isPlainObject(data) || !isPlainObject(data.stores)) {
    // 형식이 다른 파일은 그대로 넘겨 화면 쪽 검증이 안내하게 한다
    yield { type: 'done', result: data };
    return;
  }
  const { stores, ...info } = data;
  yield { type: 'chunk', info };
  for (const store of Object.keys(stores)) {
    const rows = stores[store];
    if (!Array.isArray(rows)) {
      yield { type: 'chunk', store, value: rows };
      continue;
    }
    let from = 0;
    do {
      let to = from;
      let size = 0;
      while (to < rows.length && to - from < CHUNK_ROWS && size < chunkChars) {
        size += roughSize(rows[to]);
        to += 1;
      }
      const piece = rows.slice(from, to);
      rows.fill(null, from, to);
      yield { type: 'chunk', store, rows: piece };
      from = to;
    } while (from < rows.length);
    delete stores[store];
  }
  yield { type: 'done' };
}

/** 받은 묶음을 백업 객체로 다시 만든다. */
export function createBackupReceiver() {
  let info = {};
  const stores = {};
  const define = (name, value) =>
    // '__proto__' 같은 이름도 속성으로만 남긴다(검증 단계에서 걸러진다)
    Object.defineProperty(stores, name, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return {
    accept(message) {
      if (message.info) info = message.info;
      else if ('value' in message) define(message.store, message.value);
      else {
        if (!Object.prototype.hasOwnProperty.call(stores, message.store)) define(message.store, []);
        const target = stores[message.store];
        for (const row of message.rows) target.push(row);
      }
    },
    /** @param {unknown} whole - 통째로 받은 경우의 값 */
    result(whole) {
      return whole === undefined ? { ...info, stores } : whole;
    },
  };
}
