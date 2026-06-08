/**
 * lib/nutrition/values/import.js — 연구기관 엑셀 → nutrition_raw_values 가져오기 순수 로직
 */
import { loadXlsx } from '@/lib/excel';

function getBaseCode(m) {
  if (!m.size) return m.menuCode;
  const suffix = `-${m.size}`;
  return m.menuCode.endsWith(suffix) ? m.menuCode.slice(0, -suffix.length) : m.menuCode;
}

export function normalizeName(s) {
  return (s || '').trim().replace(/\s+/g, ' ').replace(/샤삭/g, '사삭');
}

// 순서 중요: skip 패턴을 먼저, 괄호 형식 우선 (실제 엑셀은 "NAME (CRUST)" 형식)
const CRUST_PATTERNS = [
  // 괄호 형식: NAME (씬바샤삭 R) / NAME (석쇠 G) — skip
  { re: /^(.*?)\s*\(\s*씬바[샤사]삭\s*R\s*\)\s*$/i, skip: '미지원 크러스트 (씬바사삭R)' },
  { re: /^(.*?)\s*\(\s*석쇠\s*G\s*\)\s*$/i,          skip: '미지원 크러스트 (석쇠G)' },
  // 괄호 형식: NAME (CRUST)
  { re: /^(.*?)\s*\(\s*석쇠\s*L\s*\)\s*$/i,          crustType: '석쇠L' },
  { re: /^(.*?)\s*\(\s*석쇠\s*R\s*\)\s*$/i,          crustType: '석쇠R' },
  { re: /^(.*?)\s*\(\s*씬바[샤사]삭\s*L\s*\)\s*$/i,  crustType: '씬바사삭L' },
  { re: /^(.*?)\s*\(\s*1인용\s*\)\s*$/,              crustType: '석쇠L' },
  // 비괄호 형식 fallback: NAME CRUST
  { re: /^(.*?)\s+씬바[샤사]삭\s*R\s*$/i,  skip: '미지원 크러스트 (씬바사삭R)' },
  { re: /^(.*?)\s+석쇠\s*G\s*$/i,          skip: '미지원 크러스트 (석쇠G)' },
  { re: /^(.*?)\s+석쇠\s*L\s*$/i,          crustType: '석쇠L' },
  { re: /^(.*?)\s+석쇠L\s*$/i,             crustType: '석쇠L' },
  { re: /^(.*?)\s+석쇠\s*R\s*$/i,          crustType: '석쇠R' },
  { re: /^(.*?)\s+씬바[샤사]삭\s*L\s*$/i,  crustType: '씬바사삭L' },
  { re: /^(.*?)\s+1인용\s*$/,              crustType: '석쇠L' },
];

export function parseCrustSuffix(name) {
  const n = (name || '').trim();
  for (const { re, crustType, skip } of CRUST_PATTERNS) {
    const m = n.match(re);
    if (m) {
      const baseName = m[1].trim();
      if (skip) return { baseName, crustType: null, skipReason: skip };
      return { baseName, crustType, skipReason: null };
    }
  }
  return { baseName: n, crustType: '석쇠L', skipReason: null };
}

function parseNum(v) {
  if (v === '' || v == null) return '';
  const s = String(v).replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n;
}

function colIdx(headers, ...candidates) {
  for (const c of candidates) {
    const i = headers.findIndex(h => h.includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

export async function parseLabExcel(buf) {
  const XLSX = await loadXlsx();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // 제품명이 포함된 헤더 행 탐색
  let headerIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    if ((raw[i] || []).some(c => String(c ?? '').trim() === '제품명')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error('제품명 헤더 행을 찾을 수 없습니다');

  const headers = (raw[headerIdx] || []).map(c => String(c ?? '').trim());
  const CI = {
    name:   colIdx(headers, '제품명'),
    weight: colIdx(headers, '1회분 분량', '1회분 중량', '중량', '1회분중량'),
    kcal:   colIdx(headers, '열량'),
    carbs:  colIdx(headers, '탄수화물'),
    sugar:  colIdx(headers, '당류'),
    fat:    colIdx(headers, '조지방', '총지방'),
    satFat: colIdx(headers, '포화지방'),
    trans:  colIdx(headers, '트랜스지방', '트랜스 지방'),
    chol:   colIdx(headers, '콜레스테롤'),
    prot:   colIdx(headers, '단백질'),
    sod:    colIdx(headers, '나트륨'),
  };

  // 헤더 + 단위 행 건너뜀 (row2=헤더, row3=단위/기준, row4~=데이터)
  const startIdx = headerIdx + 2;
  const get = (row, idx) => (idx >= 0 ? parseNum(row[idx]) : '');

  const rows = [];
  for (let i = startIdx; i < raw.length; i++) {
    const row = raw[i];
    const rawName = CI.name >= 0 ? String(row[CI.name] ?? '').trim() : '';
    if (!rawName || rawName.startsWith('※') || rawName.startsWith('*') || rawName === '제품명') continue;
    rows.push({
      rawName,
      weight:      get(row, CI.weight),
      kcal:        get(row, CI.kcal),
      carbs:       get(row, CI.carbs),
      sugar:       get(row, CI.sugar),
      fat:         get(row, CI.fat),
      satFat:      get(row, CI.satFat),
      transFat:    get(row, CI.trans),
      cholesterol: get(row, CI.chol),
      protein:     get(row, CI.prot),
      sodium:      get(row, CI.sod),
    });
  }
  return rows;
}

/** 마스터 메뉴명에서 " 피자" 접미사 제거 후 정규화 (엑셀명 매칭용) */
function stripPizzaSuffix(s) {
  return normalizeName(s).replace(/\s*피자$/, '').trim();
}

/**
 * @param {object} opts
 * @param {object} [opts.existingKeys] - rawMap 키셋 (`menuCode__crustType` → true) — 이미 저장된 항목 감지
 */
export function buildImportRows({ rawRows, menuMasters, existingKeys = {} }) {
  // 1차 lookup: 정규화 이름 그대로
  const lookup = new Map();
  // 2차 lookup: " 피자" 접미사 제거 후 (메뉴마스터명 "크랩 피자" → "크랩")
  const lookupNoPizza = new Map();

  for (const m of menuMasters) {
    const key = normalizeName(m.menuName);
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(m);

    const keyStripped = stripPizzaSuffix(m.menuName);
    if (keyStripped !== key) {
      if (!lookupNoPizza.has(keyStripped)) lookupNoPizza.set(keyStripped, []);
      lookupNoPizza.get(keyStripped).push(m);
    }
  }

  const seen = new Map(); // 'menuCode__crustType' → result index
  const result = [];

  for (const row of rawRows) {
    const { baseName, crustType, skipReason } = parseCrustSuffix(row.rawName);

    if (skipReason) {
      result.push({
        rawName: row.rawName, baseName, crustType: null,
        status: 'skipped', skipReason, dupNote: null,
        menuCode: '', menuName: baseName, category: '',
        values: extractValues(row), include: false,
      });
      continue;
    }

    const norm = normalizeName(baseName);
    const matches = lookup.get(norm) || lookupNoPizza.get(norm) || [];
    let status, menuCode, menuName, category;

    if (matches.length >= 1) {
      const m = matches[0];
      menuCode = getBaseCode(m);
      menuName = m.menuName;
      category = m.category || '';
      status = 'matched';
    } else {
      menuCode = '';
      menuName = baseName;
      category = '';
      status = 'unmatched';
    }

    let dupNote = null;
    if (status === 'matched') {
      const dk = `${menuCode}__${crustType}`;
      // 이미 DB에 존재하는 항목
      if (existingKeys[dk]) {
        status = 'exists';
      } else if (seen.has(dk)) {
        // 동일 배치 내 중복
        result[seen.get(dk)].status = 'dup';
        result[seen.get(dk)].include = false;
        result[seen.get(dk)].dupNote = '중복 (이 행으로 덮어씀)';
        status = 'dup';
        dupNote = '중복 (마지막 행 유지)';
      }
      seen.set(dk, result.length);
    }

    result.push({
      rawName: row.rawName, baseName, crustType,
      status, skipReason: null, dupNote,
      menuCode, menuName, category,
      values: extractValues(row),
      include: status === 'matched' || status === 'dup',
    });
  }

  return result;
}

function extractValues(row) {
  return {
    weight: row.weight, kcal: row.kcal, carbs: row.carbs,
    sugar: row.sugar, fat: row.fat, satFat: row.satFat,
    transFat: row.transFat, cholesterol: row.cholesterol,
    protein: row.protein, sodium: row.sodium,
  };
}

export function toRawValueRecord({ menuCode, menuName, crustType, values }) {
  const rec = { menuCode, menuName, crustType };
  for (const [k, v] of Object.entries(values)) {
    if (v !== '' && v !== null && v !== undefined) rec[k] = v;
  }
  return rec;
}
