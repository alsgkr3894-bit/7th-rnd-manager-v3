import { CHANGE_STATUS } from '../managed-products-constants';
import { formatNumber } from '@/lib/format';
import { asDisplayText } from '@/lib/ui/prop-guards';

export const PRICE_COMPARE_PAGE_SIZE = 80;

export const FILTER_TO_STATUS = {
  up: CHANGE_STATUS.UP,
  down: CHANGE_STATUS.DOWN,
  same: CHANGE_STATUS.SAME,
  new: CHANGE_STATUS.NEW,
  deleted: CHANGE_STATUS.DELETED,
};

export const TYPE_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'exclusive', label: '전용', countKey: 'exclusive' },
  { key: 'generic', label: '범용', countKey: 'generic' },
  { key: 'generic-managed', label: '범용관리', countKey: 'generic-managed' },
];

export const CHANGE_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'up', label: '인상', color: 'var(--negative)' },
  { key: 'down', label: '인하', color: 'var(--positive)' },
  { key: 'same', label: '변동없음' },
  { key: 'new', label: '신규' },
  { key: 'deleted', label: '삭제' },
];

export function countPriceChangeStatuses(rows = []) {
  return {
    all: rows.length,
    up: rows.filter(row => row.changeStatus === CHANGE_STATUS.UP).length,
    down: rows.filter(row => row.changeStatus === CHANGE_STATUS.DOWN).length,
    same: rows.filter(row => row.changeStatus === CHANGE_STATUS.SAME).length,
    new: rows.filter(row => row.changeStatus === CHANGE_STATUS.NEW).length,
    deleted: rows.filter(row => row.changeStatus === CHANGE_STATUS.DELETED).length,
  };
}

export function buildPriceCompareCsvData(rows = [], productTypeLookup = new Map()) {
  const headers = [
    '제품코드',
    '제품명',
    '분류',
    '이전 단가',
    '현재 단가',
    '변동액',
    '변동률',
    '상태',
  ];
  const body = rows.map(row => {
    const productCode = asDisplayText(row.productCode);
    const changeRate = Number(row.changeRate);

    return [
      productCode,
      asDisplayText(row.productName),
      asDisplayText(productTypeLookup.get(productCode)?.productType),
      row.basePrice ?? '',
      row.latestPrice ?? '',
      row.changeAmount ?? '',
      Number.isFinite(changeRate) ? (changeRate * 100).toFixed(1) : '',
      asDisplayText(row.changeStatus),
    ];
  });

  return [headers, ...body];
}

export function getPriceCompareRowValues(row) {
  const safeRow = row && typeof row === 'object' ? row : {};
  return {
    productCode: asDisplayText(safeRow.productCode, '-'),
    productName: asDisplayText(safeRow.productName, '-'),
    basePrice: toFiniteOrNull(safeRow.basePrice),
    latestPrice: toFiniteOrNull(safeRow.latestPrice),
    changeAmount: toFiniteOrNull(safeRow.changeAmount),
    changeRate: toFiniteOrNull(safeRow.changeRate),
    changeStatus: asDisplayText(safeRow.changeStatus, '-'),
  };
}

export function priceChangeColor(changeStatus) {
  if (changeStatus === CHANGE_STATUS.UP) return 'var(--negative)';
  if (changeStatus === CHANGE_STATUS.DOWN) return 'var(--positive)';
  return undefined;
}

export function priceCompareAlertStyle(changeStatus, alert) {
  if (!alert) return undefined;
  return {
    background:
      changeStatus === CHANGE_STATUS.UP
        ? 'color-mix(in srgb, var(--negative) 7%, transparent)'
        : 'color-mix(in srgb, var(--positive) 7%, transparent)',
  };
}

export function formatPriceWon(value) {
  return value != null ? `${formatNumber(value)}원` : '—';
}

export function formatChangeAmount(value) {
  if (value == null) return '—';
  return `${value >= 0 ? '+' : ''}${formatNumber(value)}원`;
}

export function formatChangeRate(value) {
  if (value == null) return '—';
  return `${value >= 0 ? '▲' : '▼'} ${Math.abs(value * 100).toFixed(1)}%`;
}

function toFiniteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
