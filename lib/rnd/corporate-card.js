import { initDB, getAll, hasStore, put, deleteById, bulkPut } from '@/lib/db';
import { makeFileName } from '@/lib/download';
import { loadXlsx, matchColumn } from '@/lib/excel';

const STORE = 'rnd_corporate_card_entries';
const STATEMENT_COL_WIDTHS = [6.6, 9.6, 14.4, 3.2, 8.7, 8.7, 8.7, 8.7, 8.7, 8.7];
const MIN_DETAIL_ROWS = 35;
const MONEY_FORMAT = '_-* #,##0_-;\\-* #,##0_-;_-* "-"_-;_-@_-';
const IMPORT_COLUMNS = {
  usedAt: ['사용일', '승인일', '이용일', '거래일', '일자', '날짜', '사용일자', '승인일자'],
  cardName: ['카드번호', '카드명', '카드', '카드이름', '법인카드'],
  vendor: ['사용처', '가맹점명', '가맹점', '거래처', '구매처', '상호', '업체명'],
  amount: ['금액', '사용금액', '승인금액', '이용금액', '결제금액', '청구금액', '합계'],
  vat: ['부가세', 'VAT', '세액', '부가가치세'],
  category: ['계정과목', '분류', '항목', '비용구분', '계정'],
  ispMemo: ['ISP', '법인카드 결제 ISP', 'ISP/비고', '결제구분'],
  memo: ['적요', '비고', '내용', '메모', '품목', '사용내역'],
};

function text(value) {
  return String(value ?? '').trim();
}

function normalizeHeader(value) {
  return text(value)
    .replace(/\s+/g, '')
    .replace(/[./_\-·()]/g, '')
    .toLowerCase();
}

function amountOf(value) {
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .trim();
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function cell(row, columnName) {
  if (!columnName) return '';
  return row?.[columnName];
}

function matchCorporateColumn(headers, candidates) {
  const exact = matchColumn(headers, candidates);
  if (exact) return exact;
  const normalizedCandidates = new Set(candidates.map(normalizeHeader).filter(Boolean));
  return (Array.isArray(headers) ? headers : []).find(header =>
    normalizedCandidates.has(normalizeHeader(header))
  );
}

function detectCorporateColumns(headers) {
  const columns = Object.fromEntries(
    Object.entries(IMPORT_COLUMNS).map(([key, candidates]) => [
      key,
      matchCorporateColumn(headers, candidates) || null,
    ])
  );
  const remarkColumn = matchCorporateColumn(headers, ['비고', '비 고']);
  if (
    !columns.ispMemo &&
    remarkColumn &&
    normalizeHeader(columns.memo) !== normalizeHeader(remarkColumn)
  ) {
    columns.ispMemo = remarkColumn;
  }
  return columns;
}

function scoreCorporateHeader(columns) {
  let score = 0;
  if (columns.usedAt) score += 2;
  if (columns.vendor) score += 2;
  if (columns.amount) score += 2;
  if (columns.memo) score += 1;
  if (columns.category) score += 1;
  if (columns.cardName) score += 1;
  return score;
}

function findCorporateHeaderRow(rawRows) {
  if (!Array.isArray(rawRows)) return -1;
  const limit = Math.min(rawRows.length, 50);
  let best = { index: -1, score: 0, columns: null };

  for (let index = 0; index < limit; index += 1) {
    const row = Array.isArray(rawRows[index]) ? rawRows[index] : [];
    const headers = row.map(text);
    const columns = detectCorporateColumns(headers);
    const score = scoreCorporateHeader(columns);
    if (score > best.score) best = { index, score, columns };
  }

  if (best.score < 5) return -1;
  if (!best.columns?.usedAt || !best.columns?.amount) return -1;
  if (!best.columns?.vendor && !best.columns?.memo) return -1;
  return best.index;
}

function rowsFromRawRows(rawRows) {
  const headerRowIndex = findCorporateHeaderRow(rawRows);
  if (headerRowIndex < 0) return null;
  const headers = (rawRows[headerRowIndex] || []).map(text);
  const rows = rawRows.slice(headerRowIndex + 1).map(rawRow => {
    const obj = {};
    headers.forEach((header, index) => {
      const key = header || `__blank_${index}`;
      obj[key] = rawRow?.[index] !== undefined ? rawRow[index] : '';
    });
    return obj;
  });
  return { headers, rows, headerRowIndex };
}

function normalizeUploadDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const raw = text(value);
  if (!raw) return '';
  const compact = raw.replace(/\s+/g, '');
  const eightDigits = compact.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (eightDigits) return `${eightDigits[1]}-${eightDigits[2]}-${eightDigits[3]}`;
  const normalized = compact.replace(/[./]/g, '-').replace(/년|월/g, '-').replace(/일/g, '');
  const match = normalized.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return raw;
  const year = match[1].length === 2 ? `20${match[1]}` : match[1];
  return `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function normalizeYearMonth(value, fallbackDate = '') {
  const raw = text(value);
  const direct = raw.match(/^(\d{4})-(\d{2})$/);
  if (direct) return `${direct[1]}-${direct[2]}`;
  const date = text(fallbackDate || raw);
  const dateMatch = date.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]}`;
  return '';
}

function isNonDetailRow(row, columns) {
  const firstCell = normalizeHeader(cell(row, columns.usedAt));
  return ['합계', '총계', '소계', '비고'].includes(firstCell);
}

function blankRow() {
  return Array.from({ length: 10 }, () => '');
}

function dateCell(value) {
  const raw = text(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function periodDate(value) {
  const raw = text(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function buildBillingPeriod(entries, options = {}) {
  const explicit = text(options.period || options.billingPeriod);
  if (explicit) return explicit;
  const dates = entries
    .map(row => text(row.usedAt))
    .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();
  if (!dates.length) return '';
  return `${periodDate(dates[0])} ~ ${periodDate(dates[dates.length - 1])}`;
}

function buildStatementMerges(detailRowCount) {
  const totalRow = 8 + detailRowCount;
  const noteRow = totalRow + 1;
  const noteEndRow = noteRow + 3;
  const merges = [
    'A1:C2',
    'D1:D2',
    'B3:C3',
    'B4:C4',
    'B5:C5',
    'D3:D5',
    'E3:E5',
    'F3:F5',
    'G3:G5',
    'H3:H5',
    'I3:I5',
    'J3:J5',
  ];
  for (let row = 7; row < totalRow; row += 1) {
    merges.push(`C${row}:D${row}`, `E${row}:G${row}`, `I${row}:J${row}`);
  }
  merges.push(`A${totalRow}:G${totalRow}`, `I${totalRow}:J${totalRow}`);
  merges.push(`A${noteRow}:A${noteEndRow}`, `B${noteRow}:J${noteEndRow}`);
  return merges;
}

function sortStatementEntries(entries) {
  return [...entries].sort((a, b) =>
    String(a.usedAt || a.createdAt || '').localeCompare(String(b.usedAt || b.createdAt || ''))
  );
}

function buildCardEntry(data = {}, existing = {}) {
  const now = new Date().toISOString();
  const usedAt = text(data.usedAt ?? existing.usedAt);
  return {
    ...existing,
    usedAt,
    yearMonth: normalizeYearMonth(data.yearMonth ?? existing.yearMonth, usedAt),
    cardName: text(data.cardName ?? existing.cardName),
    vendor: text(data.vendor ?? existing.vendor),
    amount: amountOf(data.amount ?? existing.amount),
    vat: amountOf(data.vat ?? existing.vat),
    category: text(data.category ?? existing.category),
    ispMemo: text(data.ispMemo ?? existing.ispMemo),
    memo: text(data.memo ?? existing.memo),
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
}

function normalizeStoredEntry(row = {}) {
  return {
    ...row,
    usedAt: text(row.usedAt),
    yearMonth: normalizeYearMonth(row.yearMonth, row.usedAt),
    amount: amountOf(row.amount),
    vat: amountOf(row.vat),
  };
}

export async function getCorporateCardEntries() {
  await initDB();
  if (!hasStore(STORE)) return [];
  return (await getAll(STORE))
    .map(normalizeStoredEntry)
    .sort((a, b) =>
      String(b.usedAt || b.createdAt || '').localeCompare(String(a.usedAt || a.createdAt || ''))
    );
}

export async function saveCorporateCardEntry(data) {
  await initDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  return put(STORE, buildCardEntry(data));
}

export function parseCorporateCardRows(headers = [], rows = [], rawRows = null) {
  let sourceHeaders = Array.isArray(headers) ? headers : [];
  let sourceRows = Array.isArray(rows) ? rows : [];
  let sourceRowOffset = 2;

  if (headers && !Array.isArray(headers) && typeof headers === 'object') {
    sourceHeaders = Array.isArray(headers.headers) ? headers.headers : [];
    sourceRows = Array.isArray(headers.rows) ? headers.rows : [];
    rawRows = headers.rawRows;
  }

  const rawParsed = rowsFromRawRows(rawRows);
  if (rawParsed) {
    sourceHeaders = rawParsed.headers;
    sourceRows = rawParsed.rows;
    sourceRowOffset = rawParsed.headerRowIndex + 2;
  }

  const columns = detectCorporateColumns(sourceHeaders);
  const entries = [];
  const warnings = [];
  const safeRows = Array.isArray(sourceRows) ? sourceRows : [];

  safeRows.forEach((row, index) => {
    const rowNumber = index + sourceRowOffset;
    if (isNonDetailRow(row, columns)) return;
    const usedAt = normalizeUploadDate(cell(row, columns.usedAt));
    const vendor = text(cell(row, columns.vendor));
    const amountRaw = cell(row, columns.amount);
    const amount = amountOf(amountRaw);
    const hasAmount = text(amountRaw) !== '';
    const hasAnyValue = Object.values(row || {}).some(value => text(value));

    if (!hasAnyValue) return;
    if (!usedAt && !vendor && !hasAmount) return;
    if (!vendor) warnings.push(`${rowNumber}행: 사용처가 비어 있습니다.`);
    if (!hasAmount) warnings.push(`${rowNumber}행: 금액이 비어 있습니다.`);

    entries.push({
      usedAt,
      yearMonth: normalizeYearMonth('', usedAt),
      cardName: text(cell(row, columns.cardName)),
      vendor,
      amount,
      vat: amountOf(cell(row, columns.vat)),
      category: text(cell(row, columns.category)),
      ispMemo: text(cell(row, columns.ispMemo)),
      memo: text(cell(row, columns.memo)),
      sourceRowNumber: rowNumber,
    });
  });

  return { entries, warnings, columns };
}

export function buildCorporateCardMonthlySummary(entries = []) {
  const groups = new Map();
  for (const row of Array.isArray(entries) ? entries : []) {
    const yearMonth = normalizeYearMonth(row?.yearMonth, row?.usedAt) || '날짜 없음';
    const current = groups.get(yearMonth) || { yearMonth, count: 0, total: 0 };
    current.count += 1;
    current.total += amountOf(row?.amount);
    groups.set(yearMonth, current);
  }
  return [...groups.values()].sort((a, b) =>
    String(b.yearMonth).localeCompare(String(a.yearMonth))
  );
}

export async function importCorporateCardEntries(entries = []) {
  await initDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store를 찾을 수 없습니다`);
  const records = (Array.isArray(entries) ? entries : []).map(entry => buildCardEntry(entry));
  if (!records.length) return { inserted: 0 };
  await bulkPut(STORE, records);
  return { inserted: records.length };
}

export async function removeCorporateCardEntry(id) {
  await initDB();
  if (!hasStore(STORE)) return;
  return deleteById(STORE, id);
}

export function buildCorporateCardStatementWorkbookData(entries = [], options = {}) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const sortedEntries = sortStatementEntries(safeEntries);
  const detailRowCount = Math.max(MIN_DETAIL_ROWS, sortedEntries.length);
  const totalAmount = sortedEntries.reduce((sum, row) => sum + amountOf(row.amount), 0);
  const cardNumber =
    text(options.cardNumber) || text(sortedEntries.find(row => row.cardName)?.cardName);
  const claimant = text(options.claimant);
  const note = text(options.note);
  const detailRows = Array.from({ length: detailRowCount }, (_, index) => {
    const row = sortedEntries[index];
    if (!row) return blankRow();
    return [
      dateCell(row.usedAt),
      row.category || '',
      row.vendor || '',
      '',
      row.memo || '',
      '',
      '',
      amountOf(row.amount),
      row.ispMemo || row.paymentIsp || '',
      '',
    ];
  });
  const rows = [
    [
      '법인체크카드 지출경비내역서',
      '',
      '',
      '발 의',
      '담 당',
      '대리(과장)',
      '팀장(실장)',
      '본부장',
      '이사',
      '대표이사',
    ],
    blankRow(),
    ['카드번호', cardNumber, '', '관 리', '', '', '', '', '', ''],
    ['청 구 자', claimant, '', '', '', '', '', '', '', ''],
    ['청구기간', buildBillingPeriod(sortedEntries, options), '', '', '', '', '', '', '', ''],
    blankRow(),
    ['날  짜', '계정과목', '거 래 처', '', '적     요', '', '', '사용금액', '비 고', ''],
    ...detailRows,
    ['합   계', '', '', '', '', '', '', totalAmount || '', '', ''],
    ['비   고', note, '', '', '', '', '', '', '', ''],
    blankRow(),
    blankRow(),
    blankRow(),
  ];
  return {
    rows,
    cols: STATEMENT_COL_WIDTHS,
    merges: buildStatementMerges(detailRowCount),
    detailRowCount,
  };
}

function applyStatementFormats(XLSX, ws, detailRowCount) {
  const totalRow = 8 + detailRowCount;
  const noteEndRow = totalRow + 4;
  ws['!cols'] = STATEMENT_COL_WIDTHS.map(wch => ({ wch }));
  ws['!merges'] = buildStatementMerges(detailRowCount).map(range => XLSX.utils.decode_range(range));
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: noteEndRow - 1, c: 9 },
  });
  for (let row = 8; row < totalRow; row += 1) {
    const dateAddress = `A${row}`;
    const amountAddress = `H${row}`;
    if (ws[dateAddress]) ws[dateAddress].z = 'm/d/yy';
    if (ws[amountAddress]) ws[amountAddress].z = MONEY_FORMAT;
  }
  const totalAddress = `H${totalRow}`;
  if (ws[totalAddress]) ws[totalAddress].z = MONEY_FORMAT;
}

export async function downloadCorporateCardStatement(entries = [], options = {}) {
  const XLSX = await loadXlsx();
  const { rows, detailRowCount } = buildCorporateCardStatementWorkbookData(entries, options);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  applyStatementFormats(XLSX, ws, detailRowCount);
  XLSX.utils.book_append_sheet(wb, ws, '법인카드내역');
  XLSX.writeFile(wb, makeFileName('법인체크카드_지출경비내역서', 'xlsx'));
}
