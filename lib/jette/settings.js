import { asDisplayText, asFiniteNumber } from '../ui/prop-guards.js';

export const JETTE_SETTINGS_KEY = 'v3:jette-settings';

export const DEFAULT_JETTE_SETTINGS = Object.freeze({
  priceAlertThreshold: 5,
  autoRecalcOnUpdate: true,
  autoRegisterNew: 'manual',
});

export function normalizePriceAlertThreshold(value) {
  const n = asFiniteNumber(value, DEFAULT_JETTE_SETTINGS.priceAlertThreshold);
  return Math.max(1, Math.min(50, Math.round(n)));
}

export function normalizeJetteSettings(stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return { ...DEFAULT_JETTE_SETTINGS };
  }

  return {
    ...DEFAULT_JETTE_SETTINGS,
    priceAlertThreshold: normalizePriceAlertThreshold(stored.priceAlertThreshold),
    autoRecalcOnUpdate:
      typeof stored.autoRecalcOnUpdate === 'boolean'
        ? stored.autoRecalcOnUpdate
        : DEFAULT_JETTE_SETTINGS.autoRecalcOnUpdate,
    autoRegisterNew:
      stored.autoRegisterNew === 'auto' || stored.autoRegisterNew === 'manual'
        ? stored.autoRegisterNew
        : DEFAULT_JETTE_SETTINGS.autoRegisterNew,
  };
}

export function getPriceAlertThreshold(settingsOrThreshold = DEFAULT_JETTE_SETTINGS) {
  if (typeof settingsOrThreshold === 'number' || typeof settingsOrThreshold === 'string') {
    return normalizePriceAlertThreshold(settingsOrThreshold);
  }
  return normalizeJetteSettings(settingsOrThreshold).priceAlertThreshold;
}

export function getPriceChangeRatePercent(row) {
  const rate = asFiniteNumber(row?.changeRate, null);
  return rate == null ? null : Math.abs(rate * 100);
}

export function isPriceChangeAlert(row, settingsOrThreshold = DEFAULT_JETTE_SETTINGS) {
  const status = asDisplayText(row?.changeStatus);
  if (status !== '인상' && status !== '인하') return false;
  const percent = getPriceChangeRatePercent(row);
  if (percent == null) return false;
  return percent >= getPriceAlertThreshold(settingsOrThreshold);
}

export function getStoredJetteSettings(storage) {
  const store =
    storage ||
    (typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage
      : null);
  if (!store?.getItem) return { ...DEFAULT_JETTE_SETTINGS };

  try {
    return normalizeJetteSettings(JSON.parse(store.getItem(JETTE_SETTINGS_KEY) || 'null'));
  } catch (err) {
    console.warn('[jette-settings] 저장 설정 읽기 실패:', err);
    return { ...DEFAULT_JETTE_SETTINGS };
  }
}
