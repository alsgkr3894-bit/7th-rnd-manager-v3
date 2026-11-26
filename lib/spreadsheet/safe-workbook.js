/**
 * lib/spreadsheet/safe-workbook.js — 엑셀 읽기 상한 (다른 모듈에 의존하지 않는다)
 *
 * 압축 파일 크기만 막으면, 작은 xlsx가 풀리면서 수 GB가 되거나 수백만 행을 만들 수 있다.
 * 상한을 넘으면 일부만 읽지 않고 파일 전체를 거부한다.
 */
export const SPREADSHEET_LIMITS = Object.freeze({
  sheets: 100,
  rows: 300_000, // 지금 가장 큰 출고 파일은 약 3만 행
  columns: 1_000,
  cells: 5_000_000,
  cellChars: 100_000,
  unzippedBytes: 400 * 1024 * 1024,
  zipEntries: 5_000,
  timeoutMs: 90_000,
});

const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const ZIP64 = 0xffffffff;

const refuse = reason =>
  new Error(`엑셀 파일이 처리할 수 있는 범위를 넘습니다: ${reason}. 파일을 나눠서 올려 주세요.`);
const formatCount = value => value.toLocaleString('ko-KR');

export function assertRowCount(rows, limits = SPREADSHEET_LIMITS) {
  if (rows > limits.rows) throw refuse(`행이 ${formatCount(limits.rows)}개를 넘습니다`);
}
export function assertColumnCount(columns, limits = SPREADSHEET_LIMITS) {
  if (columns > limits.columns) throw refuse(`열이 ${formatCount(limits.columns)}개를 넘습니다`);
}
export function assertCellCount(cells, limits = SPREADSHEET_LIMITS) {
  if (cells > limits.cells) throw refuse(`칸이 ${formatCount(limits.cells)}개를 넘습니다`);
}
export function assertCellLength(value, limits = SPREADSHEET_LIMITS) {
  if (typeof value === 'string' && value.length > limits.cellChars) {
    throw refuse(`한 칸의 글자가 ${formatCount(limits.cellChars)}자를 넘습니다`);
  }
}

// ZIP64 항목은 크기를 추가 정보 영역(0x0001)에 8바이트로 적는다
function zip64Size(view, start, length) {
  let at = start;
  while (at + 4 <= start + length && at + 4 <= view.byteLength) {
    const id = view.getUint16(at, true);
    const size = view.getUint16(at + 2, true);
    if (id === 0x0001 && size >= 8 && at + 12 <= view.byteLength) {
      return Number(view.getBigUint64(at + 4, true));
    }
    at += 4 + size;
  }
  return Infinity;
}

/** xlsx(zip)의 목록에서 항목 수와 풀었을 때의 크기를 미리 확인한다. zip이 아니면 통과. */
export function assertSafeArchive(buffer, limits = SPREADSHEET_LIMITS) {
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lowest = Math.max(0, bytes.length - 22 - 0xffff);
  let end = -1;
  for (let at = bytes.length - 22; at >= lowest; at -= 1) {
    if (view.getUint32(at, true) === END_OF_DIRECTORY) {
      end = at;
      break;
    }
  }
  // 목록이 없으면 손상된 파일이다 — 읽는 쪽이 오류를 낸다
  if (end < 0) return;
  let at = view.getUint32(end + 16, true);
  let entries = 0;
  let total = 0;
  while (at + 46 <= bytes.length && view.getUint32(at, true) === DIRECTORY_ENTRY) {
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    let size = view.getUint32(at + 24, true);
    if (size === ZIP64) size = zip64Size(view, at + 46 + nameLength, extraLength);
    entries += 1;
    total += size;
    if (entries > limits.zipEntries) throw refuse('압축 안의 항목이 너무 많습니다');
    if (total > limits.unzippedBytes) {
      throw refuse(`압축을 풀면 ${Math.round(limits.unzippedBytes / 1024 / 1024)}MB를 넘습니다`);
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
}

// "AB12" → { column: 28, row: 12 } (둘 다 1부터)
function positionOf(address) {
  let column = 0;
  let i = 0;
  for (; i < address.length; i += 1) {
    const code = address.charCodeAt(i);
    if (code < 65 || code > 90) break;
    column = column * 26 + (code - 64);
  }
  return { column, row: Number(address.slice(i)) };
}

/** 값이 있는 칸의 범위·수·길이를 확인한다. */
function inspectSheet(sheet, limits) {
  let cells = 0;
  let rows = 0;
  let columns = 0;
  for (const address in sheet) {
    if (address.charCodeAt(0) === 33) continue; // '!ref' 같은 시트 정보
    const { column, row } = positionOf(address);
    cells += 1;
    if (row > rows) rows = row;
    if (column > columns) columns = column;
    assertCellCount(cells, limits);
    assertCellLength(sheet[address]?.v, limits);
  }
  assertRowCount(rows, limits);
  assertColumnCount(columns, limits);
  return { cells, rows, columns };
}

const areaOf = ref => {
  const [from, to = from] = String(ref || '').split(':');
  if (!from) return 0;
  const a = positionOf(from);
  const b = positionOf(to);
  return (b.row - a.row + 1) * (b.column - a.column + 1);
};

function columnName(column) {
  let name = '';
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

// 서식만 칠해 범위가 부풀려진 시트는, 행·열로 펼칠 때 빈 칸까지 돌지 않게 실제 범위로 줄인다
function shrinkInflatedRange(sheet, used, limits) {
  if (areaOf(sheet['!ref']) <= limits.cells) return;
  if (used.cells === 0) {
    delete sheet['!ref'];
    return;
  }
  const start = String(sheet['!ref']).split(':')[0];
  sheet['!ref'] = `${start}:${columnName(used.columns)}${used.rows}`;
}

/**
 * XLSX.read에 상한을 더한 것. 정상 파일의 결과는 같다.
 * @param {object} XLSX - xlsx 모듈
 */
export function readWorkbookSafely(XLSX, buffer, options, limits = SPREADSHEET_LIMITS) {
  assertSafeArchive(buffer, limits);
  // 상한보다 한 행 더 읽어, 넘는 파일인지 알 수 있게 한다
  const workbook = XLSX.read(buffer, { ...options, sheetRows: limits.rows + 1 });
  if (workbook.SheetNames.length > limits.sheets) throw refuse('시트가 너무 많습니다');
  let cells = 0;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const used = inspectSheet(sheet, limits);
    cells += used.cells;
    assertCellCount(cells, limits);
    shrinkInflatedRange(sheet, used, limits);
  }
  return workbook;
}
