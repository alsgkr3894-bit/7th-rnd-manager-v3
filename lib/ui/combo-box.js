import { asDisplayText, asStringArray, clampInteger } from './prop-guards';

const noop = () => {};

export function normalizeComboBoxValue(value) {
  return asDisplayText(value);
}

export function normalizeComboBoxClassName(className) {
  return asDisplayText(className) || undefined;
}

export function normalizeComboBoxStyle(style) {
  return style && typeof style === 'object' && !Array.isArray(style) ? style : undefined;
}

export function normalizeComboBoxMaxItems(maxItems) {
  return clampInteger(maxItems, { min: 1, fallback: 30 });
}

export function normalizeComboBoxOnChange(onChange) {
  return typeof onChange === 'function' ? onChange : noop;
}

export function normalizeComboBoxOptions(options) {
  const seen = new Set();
  const normalized = [];

  for (const option of asStringArray(options)) {
    const text = option.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }

  return normalized;
}

export function filterComboBoxOptions(options, query, maxItems) {
  const safeOptions = normalizeComboBoxOptions(options);
  const itemLimit = normalizeComboBoxMaxItems(maxItems);
  const q = normalizeComboBoxValue(query).trim().toLowerCase();
  const filtered = q ? safeOptions.filter(option => option.toLowerCase().includes(q)) : safeOptions;

  return filtered.slice(0, itemLimit);
}
