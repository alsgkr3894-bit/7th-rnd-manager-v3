/**
 * lib/report/package-plan.js — 월마감 패키지 생성 계획
 *
 * 선택 월의 데이터 신선도를 체크하고, 생성 가능한 항목 목록을 반환한다.
 * 생성 기록은 localStorage에 저장한다.
 */
import { getUploadedFiles } from '@/lib/sales';
import { getShipmentFiles } from '@/lib/shipment/store-files';
import { getPriceFiles } from '@/lib/price';
import { hasStore } from '@/lib/db';
import { normalizeYearMonth } from '@/lib/report/period';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const LS_KEY = 'monthly_close_log_v1';

/** 월마감 패키지 항목 정의 */
export const PACKAGE_ITEMS = [
  {
    id: 'sales',
    label: '판매량 보고서',
    href: '/report/sales',
    requiresData: 'sales',
    icon: '📊',
  },
  {
    id: 'cost',
    label: '원가계산 보고서',
    href: '/report/cost',
    requiresData: null,
    icon: '💰',
  },
  {
    id: 'price',
    label: '식자재 단가 보고서',
    href: '/report/price',
    requiresData: 'price',
    icon: '🏷️',
  },
  {
    id: 'shipment',
    label: '출고량 보고서',
    href: '/report/shipment',
    requiresData: 'shipment',
    icon: '🚛',
  },
  {
    id: 'origin',
    label: '원산지 표시판',
    href: '/nutrition/origin',
    requiresData: null,
    icon: '🌍',
  },
  {
    id: 'allergen',
    label: '알레르기표',
    href: '/nutrition/allergen',
    requiresData: null,
    icon: '⚠️',
  },
  {
    id: 'nutrition',
    label: '영양성분표',
    href: '/nutrition/menu',
    requiresData: null,
    icon: '🥗',
  },
];

const PACKAGE_ITEM_ID_SET = new Set(PACKAGE_ITEMS.map(item => item.id));

function readCloseLogObject() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function periodKey(period) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function cleanCompletedItems(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  const seen = new Set();

  for (const item of value) {
    const id = asDisplayText(item).trim();
    if (!PACKAGE_ITEM_ID_SET.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

function cleanCompletedAt(value) {
  const text = asDisplayText(value).trim();
  if (!text) return '';
  const time = new Date(text).getTime();
  return Number.isFinite(time) ? text : '';
}

function cleanCloseLogEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const period = normalizeYearMonth(value);
  const completedAt = cleanCompletedAt(value.completedAt);
  if (!period || !completedAt) return null;
  return {
    year: period.year,
    month: period.month,
    completedItems: cleanCompletedItems(value.completedItems),
    completedAt,
  };
}

function readCloseLogEntries() {
  const entries = {};

  for (const value of Object.values(readCloseLogObject())) {
    const entry = cleanCloseLogEntry(value);
    if (!entry) continue;
    entries[periodKey(entry)] = entry;
  }

  return entries;
}

/**
 * 선택 월의 데이터 가용성 체크
 * @param {{ year: number, month: number }} period
 * @returns {Promise<{ sales: boolean, shipment: boolean, price: boolean }>}
 */
export async function checkPeriodDataAvailability(period) {
  const result = { sales: false, shipment: false, price: false };
  const target = normalizeYearMonth(period);
  if (!target) return result;

  const [salesFiles, shipFiles, priceFiles] = await Promise.all([
    hasStore('sales_files') ? getUploadedFiles().catch(() => []) : Promise.resolve([]),
    hasStore('shipment_files') ? getShipmentFiles().catch(() => []) : Promise.resolve([]),
    hasStore('price_files') ? getPriceFiles().catch(() => []) : Promise.resolve([]),
  ]);

  result.sales = asObjectArray(salesFiles).some(
    f => asFiniteNumber(f.year) === target.year && asFiniteNumber(f.month) === target.month
  );

  result.shipment = asObjectArray(shipFiles).some(
    f => asFiniteNumber(f.year) === target.year && asFiniteNumber(f.month) === target.month
  );

  // 단가는 해당 월 또는 이전 월 데이터가 있으면 유효
  const priceRows = asObjectArray(priceFiles);
  result.price = priceRows.length > 0;

  return result;
}

/**
 * 항목별 데이터 가용성 적용 → 각 항목에 available 필드 추가
 */
export function applyAvailability(items, availability) {
  return items.map(item => ({
    ...item,
    available: item.requiresData === null ? true : (availability[item.requiresData] ?? false),
    missing: item.requiresData !== null && !availability[item.requiresData],
  }));
}

/** 월마감 완료 기록 저장 */
export function saveCloseLog(year, month, completedItems) {
  try {
    const period = normalizeYearMonth({ year, month });
    if (!period) return;

    const log = readCloseLogEntries();
    const key = periodKey(period);
    log[key] = {
      year: period.year,
      month: period.month,
      completedItems: cleanCompletedItems(completedItems),
      completedAt: new Date().toISOString(),
    };
    // 최근 12개월 기록만 유지
    const keys = Object.keys(log).sort().reverse().slice(0, 12);
    const trimmed = {};
    keys.forEach(k => (trimmed[k] = log[k]));
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

/** 월마감 기록 목록 (최신순) */
export function getCloseLogs() {
  try {
    return Object.values(readCloseLogEntries()).sort((a, b) =>
      String(b.completedAt ?? '').localeCompare(String(a.completedAt ?? ''))
    );
  } catch {
    return [];
  }
}

/** 특정 월의 기록 */
export function getCloseLog(year, month) {
  const period = normalizeYearMonth({ year, month });
  if (!period) return null;
  const key = periodKey(period);
  try {
    return readCloseLogEntries()[key] || null;
  } catch {
    return null;
  }
}
