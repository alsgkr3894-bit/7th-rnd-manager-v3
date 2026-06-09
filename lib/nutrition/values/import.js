/**
 * lib/nutrition/values/import.js — 연구기관 엑셀 → nutrition_raw_values 가져오기 순수 로직
 */
import { loadXlsx } from '@/lib/excel';

function getBaseCode(m) {
  const menuCode = String(m?.menuCode ?? '');
  const size = String(m?.size ?? '');
  if (!size) return menuCode;
  const suffix = `-${size}`;
  return menuCode.endsWith(suffix) ? menuCode.slice(0, -suffix.length) : menuCode;
}

export function normalizeName(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').replace(/샤삭/g, '사삭');
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
  { re: /^(.*?)\s*\(\s*1인용\s*\)\s*$/,              crustType: '씬바사삭L', personal: true },
  // 비괄호 형식 fallback: NAME CRUST
  { re: /^(.*?)\s+씬바[샤사]삭\s*R\s*$/i,  skip: '미지원 크러스트 (씬바사삭R)' },
  { re: /^(.*?)\s+석쇠\s*G\s*$/i,          skip: '미지원 크러스트 (석쇠G)' },
  { re: /^(.*?)\s+석쇠\s*L\s*$/i,          crustType: '석쇠L' },
  { re: /^(.*?)\s+석쇠L\s*$/i,             crustType: '석쇠L' },
  { re: /^(.*?)\s+석쇠\s*R\s*$/i,          crustType: '석쇠R' },
  { re: /^(.*?)\s+씬바[샤사]삭\s*L\s*$/i,  crustType: '씬바사삭L' },
  { re: /^(.*?)\s+1인용\s*$/,              crustType: '씬바사삭L', personal: true },
];

export function parseCrustSuffix(name) {
  const n = String(name || '').trim();
  for (const { re, crustType, skip, personal } of CRUST_PATTERNS) {
    const m = n.match(re);
    if (m) {
      const baseName = m[1].trim();
      if (skip) return { baseName, crustType: null, skipReason: skip, personal: false };
      return { baseName, crustType, skipReason: null, personal: !!personal };
    }
  }
  return { baseName: n, crustType: '석쇠L', skipReason: null, personal: false };
}

function parseNum(v) {
  if (v === '' || v == null) return '';
  const s = String(v).replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n;
}

function colIdx(headers, ...candidates) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  for (const c of candidates) {
    const i = safeHeaders.findIndex(h => String(h || '').includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

export async function parseLabExcel(buf) {
  const XLSX = await loadXlsx();
  const wb = XLSX.read(buf, { type: 'array' });

  const allRows = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // 시트 유형: 사이드/side 포함 여부
    const sheetType = /사이드|side/i.test(sheetName) ? 'side' : 'pizza';

    // 제품명이 포함된 헤더 행 탐색
    let headerIdx = -1;
    for (let i = 0; i < Math.min(raw.length, 20); i++) {
      if ((raw[i] || []).some(c => String(c ?? '').trim() === '제품명')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) continue; // 헤더 없으면 이 시트 스킵

    const headers = (raw[headerIdx] || []).map(c => String(c ?? '').trim());
    const CI = {
      name:   colIdx(headers, '제품명'),
      weight: colIdx(headers, '총중량', '총 중량', '1회분 분량', '1회분 중량', '중량', '1회분중량'),
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

    // 단위행 가정 제거 — 헤더 바로 다음 행부터 데이터
    const startIdx = headerIdx + 1;
    const get = (row, idx) => (idx >= 0 ? parseNum(row[idx]) : '');

    for (let i = startIdx; i < raw.length; i++) {
      const row = raw[i];
      const rawName = CI.name >= 0 ? String(row[CI.name] ?? '').trim() : '';
      if (!rawName || rawName.startsWith('※') || rawName.startsWith('*') || rawName === '제품명') continue;
      allRows.push({
        rawName,
        sheetType,
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
  }

  if (allRows.length === 0) throw new Error('제품명 헤더 행을 찾을 수 없습니다');
  return allRows;
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
  const safeRawRows = Array.isArray(rawRows) ? rawRows : [];
  const safeMenuMasters = Array.isArray(menuMasters) ? menuMasters.filter(m => m && typeof m === 'object') : [];
  const safeExistingKeys = existingKeys && typeof existingKeys === 'object' && !Array.isArray(existingKeys)
    ? existingKeys
    : {};
  // 1차 lookup: 정규화 이름 그대로
  const lookup = new Map();
  // 2차 lookup: " 피자" 접미사 제거 후 (메뉴마스터명 "크랩 피자" → "크랩")
  const lookupNoPizza = new Map();

  for (const m of safeMenuMasters) {
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

  for (const row of safeRawRows) {
    const safeRow = row && typeof row === 'object' ? row : {};
    const rawName = String(safeRow.rawName ?? '');
    const isSide = safeRow.sheetType === 'side';

    // 사이드: 크러스트 파싱 없이 단일 슬롯
    if (isSide) {
      const norm = normalizeName(rawName);
      const matches = lookup.get(norm) || lookupNoPizza.get(norm) || [];
      let status, menuCode, menuName, category;
      if (matches.length >= 1) {
        const m = matches[0];
        menuCode = getBaseCode(m);
        menuName = m.menuName;
        category = m.category || '사이드';
        status = 'matched';
      } else {
        menuCode = '';
        menuName = rawName;
        category = '사이드';
        status = 'unmatched';
      }
      const crustType = '석쇠L';
      let dupNote = null;
      if (status === 'matched') {
        const dk = `${menuCode}__${crustType}`;
        if (safeExistingKeys[dk]) {
          status = 'exists';
        } else if (seen.has(dk)) {
          result[seen.get(dk)].status = 'dup';
          result[seen.get(dk)].include = false;
          result[seen.get(dk)].dupNote = '중복 (이 행으로 덮어씀)';
          status = 'dup';
          dupNote = '중복 (마지막 행 유지)';
        }
        seen.set(dk, result.length);
      }
      result.push({
        rawName, baseName: rawName, crustType,
        status, skipReason: null, dupNote,
        menuCode, menuName, category,
        basis: 'serving',
        values: extractValues(safeRow),
        include: status === 'matched' || status === 'dup',
      });
      continue;
    }

    // 피자: 기존 크러스트 파싱
    const { baseName, crustType, skipReason, personal } = parseCrustSuffix(rawName);

    if (skipReason) {
      result.push({
        rawName, baseName, crustType: null,
        status: 'skipped', skipReason, dupNote: null,
        menuCode: '', menuName: baseName, category: '',
        values: extractValues(safeRow), include: false,
      });
      continue;
    }

    // 1인용: 메뉴명 "○○ (1인용)", 카테고리 1인피자
    const resolvedMenuName = personal ? `${baseName} (1인용)` : null;
    const resolvedCategory = personal ? '1인피자' : null;

    const norm = normalizeName(baseName);
    // 1인용은 마스터에서 "○○ (1인용)" 또는 baseName+카테고리=1인피자 우선 탐색
    let matches = [];
    if (personal) {
      const normFull = normalizeName(`${baseName} (1인용)`);
      matches = lookup.get(normFull) || lookup.get(norm) || lookupNoPizza.get(norm) || [];
      // 1인피자 카테고리로 필터링
      const personal1in = matches.filter(m => (m.category || '') === '1인피자');
      if (personal1in.length) matches = personal1in;
    } else {
      matches = lookup.get(norm) || lookupNoPizza.get(norm) || [];
    }

    let status, menuCode, menuName, category;
    if (matches.length >= 1) {
      const m = matches[0];
      menuCode = getBaseCode(m);
      menuName = resolvedMenuName || m.menuName;
      category = resolvedCategory || m.category || '';
      status = 'matched';
    } else {
      menuCode = '';
      menuName = resolvedMenuName || baseName;
      category = resolvedCategory || '';
      status = 'unmatched';
    }

    let dupNote = null;
    if (status === 'matched') {
      const dk = `${menuCode}__${crustType}`;
      if (safeExistingKeys[dk]) {
        status = 'exists';
      } else if (seen.has(dk)) {
        result[seen.get(dk)].status = 'dup';
        result[seen.get(dk)].include = false;
        result[seen.get(dk)].dupNote = '중복 (이 행으로 덮어씀)';
        status = 'dup';
        dupNote = '중복 (마지막 행 유지)';
      }
      seen.set(dk, result.length);
    }

    result.push({
      rawName, baseName, crustType,
      status, skipReason: null, dupNote,
      menuCode, menuName, category,
      ...(personal ? { basis: undefined } : {}),
      values: extractValues(safeRow),
      include: status === 'matched' || status === 'dup',
    });
  }

  return result;
}

function extractValues(row) {
  const safeRow = row && typeof row === 'object' ? row : {};
  return {
    weight: safeRow.weight, kcal: safeRow.kcal, carbs: safeRow.carbs,
    sugar: safeRow.sugar, fat: safeRow.fat, satFat: safeRow.satFat,
    transFat: safeRow.transFat, cholesterol: safeRow.cholesterol,
    protein: safeRow.protein, sodium: safeRow.sodium,
  };
}

export function toRawValueRecord({ menuCode, menuName, crustType, category, basis, values } = {}) {
  const rec = { menuCode, menuName, crustType };
  if (category) rec.category = category;
  if (basis === 'serving') rec.basis = 'serving';
  const safeValues = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
  for (const [k, v] of Object.entries(safeValues)) {
    if (v !== '' && v !== null && v !== undefined) rec[k] = v;
  }
  return rec;
}
