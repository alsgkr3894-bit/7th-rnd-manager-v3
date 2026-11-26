/**
 * lib/backup/file-format.js — 백업 파일 형식 (브라우저·Node 공용, 다른 모듈에 의존하지 않는다)
 *
 * 예전 형식은 전체를 JSON 문자열 하나로 만들고 읽었다. 백업이 수백 MB가 되면 복원 업로드 한도와
 * 브라우저의 문자열 길이 한계(약 5억 자)에 걸려 백업을 만들 수도 읽을 수도 없게 된다.
 *
 * 형식 2 — gzip으로 압축한 줄 단위 JSON. 한 번에 한 줄(레코드 하나)만 문자열로 다룬다.
 *   {"rndBackup":2, ...stores를 뺀 백업 정보}
 *   {"store":"menu_master","rows":2}
 *   {레코드}
 *   {레코드}
 *   {"end":true,"stores":1,"rows":2}       ← 없으면 저장이 끝나지 않은 파일
 * 읽은 결과는 예전과 같은 객체({ ...정보, stores })다. 예전 .json 백업도 그대로 읽는다.
 */

export const BACKUP_FORMAT = 2;
const WRITE_PIECE_CHARS = 1 << 20;
/**
 * 압축을 푼 전체 글자 수, 한 줄(레코드 하나), 저장소 수, 전체 행 수, 값이 겹친 깊이의 상한 —
 * 비정상 파일이 메모리를 다 쓰지 않게
 */
export const BACKUP_LIMITS = {
  totalChars: 3 * 1024 ** 3,
  lineChars: 64 * 1024 ** 2,
  stores: 200,
  rows: 5_000_000,
  depth: 64,
};

const DAMAGED = '백업 파일이 손상되었거나 완전히 저장되지 않았습니다.';
const TOO_MANY_STORES = '백업 파일의 저장소가 너무 많습니다.';
const TOO_MANY_ROWS = '백업 파일의 행이 너무 많습니다.';
const TOO_DEEP = '백업 파일의 데이터가 너무 깊게 겹쳐 있습니다.';

// 행 하나의 값이 limit 단계보다 깊게 겹쳐 있는지 — 넘으면 더 내려가지 않는다
function assertDepth(value, limit) {
  if (value === null || typeof value !== 'object') return;
  if (limit <= 0) throw new Error(TOO_DEEP);
  for (const key in value) assertDepth(value[key], limit - 1);
}

/** 예전 JSON 형식은 읽은 뒤에 한 번에 확인한다 */
function assertBackupShape(data, limits) {
  const stores = data?.stores;
  if (!stores || typeof stores !== 'object') return;
  const names = Object.keys(stores);
  if (names.length > limits.stores) throw new Error(TOO_MANY_STORES);
  let total = 0;
  for (const name of names) {
    const rows = stores[name];
    if (!Array.isArray(rows)) continue;
    total += rows.length;
    if (total > limits.rows) throw new Error(TOO_MANY_ROWS);
    for (const row of rows) assertDepth(row, limits.depth);
  }
}

function* backupLines(data) {
  const { stores = {}, ...info } = data || {};
  yield JSON.stringify({ rndBackup: BACKUP_FORMAT, ...info });
  let storeCount = 0;
  let rowCount = 0;
  for (const [store, rows] of Object.entries(stores)) {
    if (!Array.isArray(rows)) throw new Error(`백업할 저장소 값이 배열이 아닙니다: ${store}`);
    yield JSON.stringify({ store, rows: rows.length });
    for (const row of rows) yield JSON.stringify(row) ?? 'null';
    storeCount += 1;
    rowCount += rows.length;
  }
  yield JSON.stringify({ end: true, stores: storeCount, rows: rowCount });
}

/** 백업 객체 → 압축된 파일 Blob */
export async function createBackupBlob(data) {
  const lines = backupLines(data);
  const encoder = new TextEncoder();
  const source = new ReadableStream({
    pull(controller) {
      const piece = [];
      let size = 0;
      while (size < WRITE_PIECE_CHARS) {
        const { value, done } = lines.next();
        if (done) break;
        piece.push(value, '\n');
        size += value.length + 1;
      }
      if (piece.length === 0) controller.close();
      else controller.enqueue(encoder.encode(piece.join('')));
    },
  });
  const compressed = source.pipeThrough(new CompressionStream('gzip'));
  return new Response(compressed, { headers: { 'content-type': 'application/gzip' } }).blob();
}

export async function isGzipBlob(blob) {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  return head[0] === 0x1f && head[1] === 0x8b;
}

/** 줄을 하나씩 받아 백업 객체를 만든다 */
function createAssembler(limits) {
  let info = null;
  let declaredRows = 0;
  let current = null; // 읽는 중인 저장소: { rows, remaining }
  let done = false;
  let rowCount = 0;
  const stores = {};

  function line(text) {
    if (done) throw new Error(DAMAGED);
    const value = JSON.parse(text);
    if (!info) {
      const { rndBackup, ...rest } = value || {};
      if (rndBackup !== BACKUP_FORMAT) {
        throw new Error(
          rndBackup > BACKUP_FORMAT
            ? '더 새로운 버전에서 만든 백업 파일입니다. 앱을 업데이트한 뒤 복원해 주세요.'
            : '백업 파일 형식이 아닙니다.'
        );
      }
      info = rest;
      return;
    }
    if (current && current.remaining > 0) {
      assertDepth(value, limits.depth);
      current.rows.push(value);
      current.remaining -= 1;
      rowCount += 1;
      return;
    }
    if (value?.end === true) {
      if (value.stores !== Object.keys(stores).length || value.rows !== rowCount) {
        throw new Error(DAMAGED);
      }
      done = true;
      return;
    }
    const { store, rows } = value || {};
    const valid =
      typeof store === 'string' &&
      store !== '__proto__' &&
      !Object.prototype.hasOwnProperty.call(stores, store) &&
      Number.isInteger(rows) &&
      rows >= 0;
    if (!valid) throw new Error(DAMAGED);
    if (Object.keys(stores).length >= limits.stores) throw new Error(TOO_MANY_STORES);
    declaredRows += rows;
    if (declaredRows > limits.rows) throw new Error(TOO_MANY_ROWS);
    stores[store] = [];
    current = { rows: stores[store], remaining: rows };
  }

  function result() {
    if (!done) throw new Error(DAMAGED);
    return { ...info, stores };
  }

  return { line, result };
}

// 압축된 파일을 얼마나 읽었는지(0~100) 알린다
function progressCounter(size, onProgress) {
  let read = 0;
  let last = -1;
  return new TransformStream({
    transform(chunk, controller) {
      read += chunk.byteLength;
      const percent = Math.min(100, Math.floor((read / size) * 100));
      if (percent !== last) {
        last = percent;
        onProgress(percent);
      }
      controller.enqueue(chunk);
    },
  });
}

async function readCompressed(blob, limits, onProgress) {
  let source = blob.stream();
  if (onProgress) source = source.pipeThrough(progressCounter(blob.size, onProgress));
  const reader = source
    .pipeThrough(new DecompressionStream('gzip'))
    .pipeThrough(new TextDecoderStream('utf-8', { fatal: true }))
    .getReader();
  const assembler = createAssembler(limits);
  let pending = []; // 아직 줄이 끝나지 않은 조각
  let pendingChars = 0;
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limits.totalChars) throw new Error('백업 파일이 너무 큽니다.');
      let start = 0;
      for (let end = value.indexOf('\n'); end !== -1; end = value.indexOf('\n', start)) {
        pending.push(value.slice(start, end));
        assembler.line(pending.join(''));
        pending = [];
        pendingChars = 0;
        start = end + 1;
      }
      if (start < value.length) {
        pending.push(value.slice(start));
        pendingChars += value.length - start;
        if (pendingChars > limits.lineChars) throw new Error(DAMAGED);
      }
    }
  } catch (error) {
    await reader.cancel().catch(cancelError => {
      // 이미 오류로 끝난 스트림이면 취소가 같은 오류를 다시 던진다
      console.warn('[backup] 읽기 취소:', cancelError?.message);
    });
    // 우리가 만든 안내는 그대로, 압축 해제·JSON 해석 오류는 손상 안내로 바꾼다
    throw /^(백업|더 새로운)/.test(error?.message) ? error : new Error(DAMAGED);
  }
  if (pending.length > 0) throw new Error(DAMAGED);
  return assembler.result();
}

/**
 * 백업 파일(압축 형식 또는 예전 JSON) → 백업 객체
 * @param {Blob} blob
 * @param {typeof BACKUP_LIMITS} [limits]
 * @param {(percent: number) => void} [onProgress] - 압축 형식에서만 알린다
 */
export async function parseBackupBlob(blob, limits = BACKUP_LIMITS, onProgress) {
  if (await isGzipBlob(blob)) return readCompressed(blob, limits, onProgress);
  let text = await blob.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      '잘못된 JSON 형식입니다 — 백업 파일이 손상되었거나 완전히 다운로드되지 않았습니다.'
    );
  }
  assertBackupShape(data, limits);
  return data;
}
