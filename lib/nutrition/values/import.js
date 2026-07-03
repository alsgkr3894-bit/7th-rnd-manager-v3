/**
 * lib/nutrition/values/import.js — 연구기관 엑셀 → nutrition_raw_values 가져오기 순수 로직
 */
import { loadXlsx } from '@/lib/excel';
import { isPersonalPizzaCategory } from '@/lib/menu-master/category-policy';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { SERVING_CRUST_TYPE } from '@/lib/nutrition/crust-config';
import { normalizeNutritionCategory } from '@/lib/nutrition/menu-group';

export function normalizeName(s) {
  return String(s || '')
    .normalize('NFKC')
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[·ㆍ]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/샤삭/g, '사삭');
}

export function normalizeImportMatchKey(value) {
  let name = normalizeName(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^0+(?=\S)/, '')
    .replace(/\bnew\b/gi, ' ')
    .replace(/신메뉴/g, ' ')
    .replace(/출시/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (let i = 0; i < 2; i += 1) {
    name = name
      .replace(/\s+(?:L|R|라지|레귤러|Large|Regular)\s*$/i, '')
      .replace(/\s*피자\s*$/i, '')
      .trim();
  }

  return name.replace(/[^0-9A-Za-z가-힣]+/g, '').toLowerCase();
}

function normalizeCodeKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function codeCandidates(value) {
  const code = normalizeCodeKey(value);
  if (!code) return [];
  const candidates = [code];
  const noSize = code.replace(/-(?:L|R)$/i, '');
  if (noSize && noSize !== code) candidates.push(noSize);
  return candidates;
}

// 순서 중요: skip 패턴을 먼저, 괄호 형식 우선 (실제 엑셀은 "NAME (CRUST)" 형식)
const CRUST_PATTERNS = [
  // 괄호 형식: NAME (석쇠 G) — skip
  { re: /^(.*?)\s*\(\s*석쇠\s*G\s*\)\s*$/i, skip: '미지원 크러스트 (석쇠G)' },
  // 괄호 형식: NAME (CRUST)
  { re: /^(.*?)\s*\(\s*석쇠\s*L\s*\)\s*$/i, crustType: '석쇠L' },
  { re: /^(.*?)\s*\(\s*석쇠\s*R\s*\)\s*$/i, crustType: '석쇠R' },
  { re: /^(.*?)\s*\(\s*씬바[샤사]삭\s*L\s*\)\s*$/i, crustType: '씬바사삭L' },
  { re: /^(.*?)\s*\(\s*씬바[샤사]삭\s*R\s*\)\s*$/i, skip: '미사용 크러스트' },
  { re: /^(.*?)\s*\(\s*1인용\s*\)\s*$/, crustType: '씬바사삭L', personal: true },
  // 비괄호 형식 fallback: NAME CRUST
  { re: /^(.*?)\s+석쇠\s*G\s*$/i, skip: '미지원 크러스트 (석쇠G)' },
  { re: /^(.*?)\s+석쇠\s*L\s*$/i, crustType: '석쇠L' },
  { re: /^(.*?)\s+석쇠L\s*$/i, crustType: '석쇠L' },
  { re: /^(.*?)\s+석쇠\s*R\s*$/i, crustType: '석쇠R' },
  { re: /^(.*?)\s+씬바[샤사]삭\s*L\s*$/i, crustType: '씬바사삭L' },
  { re: /^(.*?)\s+씬바[샤사]삭\s*R\s*$/i, skip: '미사용 크러스트' },
  { re: /^(.*?)\s+1인용\s*$/, crustType: '씬바사삭L', personal: true },
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
  // 음수 부호를 보존(기존엔 제거돼 -5가 5로 뒤집힘). 숫자/소수점/선행 마이너스만 남긴다.
  const s = String(v)
    .replace(/[^\d.-]/g, '')
    .replace(/(?!^)-/g, ''); // 선행 위치가 아닌 마이너스 제거
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
      name: colIdx(headers, '제품명'),
      code: colIdx(
        headers,
        '메뉴코드',
        '메뉴 코드',
        '제품코드',
        '제품 코드',
        '상품코드',
        '상품 코드',
        '코드'
      ),
      weight: colIdx(headers, '총중량', '총 중량', '1회분 분량', '1회분 중량', '중량', '1회분중량'),
      kcal: colIdx(headers, '열량'),
      carbs: colIdx(headers, '탄수화물'),
      sugar: colIdx(headers, '당류'),
      fat: colIdx(headers, '조지방', '총지방'),
      satFat: colIdx(headers, '포화지방'),
      trans: colIdx(headers, '트랜스지방', '트랜스 지방'),
      chol: colIdx(headers, '콜레스테롤'),
      prot: colIdx(headers, '단백질'),
      sod: colIdx(headers, '나트륨'),
    };

    // 단위행 가정 제거 — 헤더 바로 다음 행부터 데이터
    const startIdx = headerIdx + 1;
    const get = (row, idx) => (idx >= 0 ? parseNum(row[idx]) : '');

    for (let i = startIdx; i < raw.length; i++) {
      const row = raw[i];
      const rawName = CI.name >= 0 ? String(row[CI.name] ?? '').trim() : '';
      if (!rawName || rawName.startsWith('※') || rawName.startsWith('*') || rawName === '제품명')
        continue;
      allRows.push({
        rawName,
        rawCode: CI.code >= 0 ? String(row[CI.code] ?? '').trim() : '',
        sheetType,
        weight: get(row, CI.weight),
        kcal: get(row, CI.kcal),
        carbs: get(row, CI.carbs),
        sugar: get(row, CI.sugar),
        fat: get(row, CI.fat),
        satFat: get(row, CI.satFat),
        transFat: get(row, CI.trans),
        cholesterol: get(row, CI.chol),
        protein: get(row, CI.prot),
        sodium: get(row, CI.sod),
      });
    }
  }

  if (allRows.length === 0) throw new Error('제품명 헤더 행을 찾을 수 없습니다');
  return allRows;
}

/** 마스터 메뉴명에서 " 피자" 접미사 제거 후 정규화 (엑셀명 매칭용) */
function stripPizzaSuffix(s) {
  return normalizeName(s)
    .replace(/\s*피자$/, '')
    .trim();
}

function pushLookup(map, key, menu) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  const bucket = map.get(key);
  if (!bucket.some(item => item === menu)) bucket.push(menu);
}

function buildMenuLookups(menuMasters) {
  const nameLookup = new Map();
  const codeLookup = new Map();

  for (const menu of menuMasters) {
    const nameKeys = new Set([
      normalizeImportMatchKey(menu.menuName),
      normalizeImportMatchKey(stripPizzaSuffix(menu.menuName)),
    ]);
    for (const key of nameKeys) pushLookup(nameLookup, key, menu);

    for (const code of codeCandidates(menu.menuCode)) pushLookup(codeLookup, code, menu);
    const baseCode = normalizeCodeKey(getMenuCodeBase(menu));
    if (baseCode) pushLookup(codeLookup, baseCode, menu);
  }

  return { nameLookup, codeLookup };
}

function findByCode(codeLookup, code) {
  for (const key of codeCandidates(code)) {
    const matches = codeLookup.get(key);
    if (matches?.length) return matches;
  }
  return [];
}

function findByName(nameLookup, ...names) {
  for (const name of names) {
    const key = normalizeImportMatchKey(name);
    if (!key) continue;
    const matches = nameLookup.get(key);
    if (matches?.length) return matches;
  }
  return [];
}

function normalizeAliasMap(aliasMap) {
  if (!aliasMap || typeof aliasMap !== 'object' || Array.isArray(aliasMap)) return {};
  const normalized = {};
  for (const [key, value] of Object.entries(aliasMap)) {
    if (!value || typeof value !== 'object') continue;
    const matchKey = normalizeImportMatchKey(key);
    const menuCode = String(value.menuCode || '').trim();
    if (!matchKey || !menuCode) continue;
    normalized[matchKey] = {
      menuCode,
      menuName: String(value.menuName || '').trim(),
      category: String(value.category || '').trim(),
    };
  }
  return normalized;
}

function findAlias(aliasMap, ...names) {
  for (const name of names) {
    const alias = aliasMap[normalizeImportMatchKey(name)];
    if (alias?.menuCode) return alias;
  }
  return null;
}

function pickMatch(matches, preferredCategory = '') {
  const safeMatches = Array.isArray(matches) ? matches.filter(Boolean) : [];
  if (!safeMatches.length) return null;
  if (preferredCategory) {
    const preferred = safeMatches.find(
      menu => normalizeNutritionCategory(menu.category, preferredCategory) === preferredCategory
    );
    if (preferred) return preferred;
  }
  return safeMatches[0];
}

function resolveMatchedMenu({
  codeLookup,
  nameLookup,
  aliasMap,
  rawCode,
  rawName,
  baseName,
  preferredCategory,
}) {
  const codeMatch = pickMatch(findByCode(codeLookup, rawCode), preferredCategory);
  if (codeMatch) return { menu: codeMatch, source: 'code' };

  const alias = findAlias(aliasMap, rawName, baseName);
  if (alias) {
    const aliasMatch = pickMatch(findByCode(codeLookup, alias.menuCode), preferredCategory);
    if (aliasMatch) return { menu: aliasMatch, source: 'saved' };
  }

  const nameMatch = pickMatch(findByName(nameLookup, rawName, baseName), preferredCategory);
  if (nameMatch) return { menu: nameMatch, source: 'name' };

  return { menu: null, source: '' };
}

function hasExistingRawValue(existingKeys, menuCode, crustType, { serving = false } = {}) {
  if (existingKeys?.[`${menuCode}__${crustType}`]) return true;
  return serving && existingKeys?.[`${menuCode}__석쇠L`];
}

/**
 * @param {object} opts
 * @param {object} [opts.existingKeys] - rawMap 키셋 (`menuCode__crustType` → true) — 이미 저장된 항목 감지
 */
export function buildImportRows({ rawRows, menuMasters, existingKeys = {}, aliasMap = {} }) {
  const safeRawRows = Array.isArray(rawRows) ? rawRows : [];
  const safeMenuMasters = Array.isArray(menuMasters)
    ? menuMasters.filter(m => m && typeof m === 'object')
    : [];
  const safeExistingKeys =
    existingKeys && typeof existingKeys === 'object' && !Array.isArray(existingKeys)
      ? existingKeys
      : {};
  const { nameLookup, codeLookup } = buildMenuLookups(safeMenuMasters);
  const safeAliasMap = normalizeAliasMap(aliasMap);

  const seen = new Map(); // 'menuCode__crustType' → result index
  const result = [];

  for (const row of safeRawRows) {
    const safeRow = row && typeof row === 'object' ? row : {};
    const rawName = String(safeRow.rawName ?? '');
    const isSide = safeRow.sheetType === 'side';

    // 사이드: 크러스트 파싱 없이 단일 슬롯
    if (isSide) {
      const { menu: matchedMenu, source: matchSource } = resolveMatchedMenu({
        codeLookup,
        nameLookup,
        aliasMap: safeAliasMap,
        rawCode: safeRow.rawCode,
        rawName,
        baseName: rawName,
        preferredCategory: '사이드',
      });
      let status, menuCode, menuName, category;
      if (matchedMenu) {
        menuCode = getMenuCodeBase(matchedMenu);
        menuName = matchedMenu.menuName;
        category = normalizeNutritionCategory(matchedMenu.category, '사이드');
        status = 'matched';
      } else {
        menuCode = '';
        menuName = rawName;
        category = '사이드';
        status = 'unmatched';
      }
      const crustType = SERVING_CRUST_TYPE;
      let dupNote = null;
      if (status === 'matched') {
        const dk = `${menuCode}__${crustType}`;
        if (hasExistingRawValue(safeExistingKeys, menuCode, crustType, { serving: true })) {
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
        rawName,
        rawCode: safeRow.rawCode || '',
        baseName: rawName,
        crustType,
        status,
        matchSource: status === 'matched' ? matchSource : '',
        skipReason: null,
        dupNote,
        menuCode,
        menuName,
        category,
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
        rawName,
        rawCode: safeRow.rawCode || '',
        baseName,
        crustType: null,
        status: 'skipped',
        skipReason,
        dupNote: null,
        menuCode: '',
        menuName: baseName,
        category: '',
        values: extractValues(safeRow),
        include: false,
      });
      continue;
    }

    // 1인용: 메뉴명 "○○ (1인용)", 카테고리 1인피자
    const resolvedMenuName = personal ? `${baseName} (1인용)` : null;
    const resolvedCategory = personal ? '1인피자' : null;

    // 1인용은 마스터에서 "○○ (1인용)" 또는 baseName+카테고리=1인피자 우선 탐색
    let matchedMenu = null;
    let matchSource = '';
    if (personal) {
      const normFull = normalizeName(`${baseName} (1인용)`);
      const resolved = resolveMatchedMenu({
        codeLookup,
        nameLookup,
        aliasMap: safeAliasMap,
        rawCode: safeRow.rawCode,
        rawName: normFull,
        baseName,
        preferredCategory: '피자',
      });
      let personalMatches = resolved.menu ? [resolved.menu] : [];
      // 1인피자 카테고리로 필터링
      const personal1in = personalMatches.filter(m => isPersonalPizzaCategory(m.category));
      if (personal1in.length) personalMatches = personal1in;
      matchedMenu = personalMatches[0] || null;
      matchSource = resolved.source;
    } else {
      const resolved = resolveMatchedMenu({
        codeLookup,
        nameLookup,
        aliasMap: safeAliasMap,
        rawCode: safeRow.rawCode,
        rawName,
        baseName,
        preferredCategory: '피자',
      });
      matchedMenu = resolved.menu;
      matchSource = resolved.source;
    }

    let status, menuCode, menuName, category;
    if (matchedMenu) {
      menuCode = getMenuCodeBase(matchedMenu);
      menuName = resolvedMenuName || matchedMenu.menuName;
      category = normalizeNutritionCategory(resolvedCategory || matchedMenu.category || '', '피자');
      status = 'matched';
    } else {
      menuCode = '';
      menuName = resolvedMenuName || baseName;
      category = normalizeNutritionCategory(resolvedCategory || '', '피자');
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
      rawName,
      rawCode: safeRow.rawCode || '',
      baseName,
      crustType,
      status,
      matchSource: status === 'matched' ? matchSource : '',
      skipReason: null,
      dupNote,
      menuCode,
      menuName,
      category,
      personal,
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
    weight: safeRow.weight,
    kcal: safeRow.kcal,
    carbs: safeRow.carbs,
    sugar: safeRow.sugar,
    fat: safeRow.fat,
    satFat: safeRow.satFat,
    transFat: safeRow.transFat,
    cholesterol: safeRow.cholesterol,
    protein: safeRow.protein,
    sodium: safeRow.sodium,
  };
}

export function toRawValueRecord({ menuCode, menuName, crustType, category, basis, values } = {}) {
  const rec = { menuCode, menuName, crustType };
  if (category) rec.category = normalizeNutritionCategory(category, '피자');
  if (basis === 'serving') rec.basis = 'serving';
  const safeValues = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
  for (const [k, v] of Object.entries(safeValues)) {
    if (v !== '' && v !== null && v !== undefined) rec[k] = v;
  }
  return rec;
}
