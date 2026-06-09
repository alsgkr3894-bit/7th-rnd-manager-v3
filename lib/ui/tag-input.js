import { asDisplayText, asStringArray, clampInteger } from './prop-guards';

export const DEFAULT_TAG_INPUT_PLACEHOLDER = '태그 입력 후 Enter…';
export const DEFAULT_TAG_SUGGESTION_LIMIT = 7;

const noop = () => {};

function toTagCandidates(value) {
  if (Array.isArray(value)) return value;

  const text = asDisplayText(value);
  return text ? text.split(',') : [];
}

export function normalizeTagText(value) {
  return asDisplayText(value).trim();
}

export function normalizeTagInputPlaceholder(value) {
  return asDisplayText(value, DEFAULT_TAG_INPUT_PLACEHOLDER);
}

export function parseTagInputValue(value) {
  const seen = new Set();
  const tags = [];

  for (const part of toTagCandidates(value)) {
    const tag = normalizeTagText(part);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function serializeTagInputValue(tags) {
  return parseTagInputValue(tags).join(', ');
}

export function normalizeTagSuggestions(suggestions, selectedTags = []) {
  const selected = new Set(parseTagInputValue(selectedTags));
  const seen = new Set();
  const normalized = [];

  for (const suggestion of asStringArray(suggestions)) {
    const tag = normalizeTagText(suggestion);
    if (!tag || selected.has(tag) || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
  }

  return normalized;
}

export function filterTagSuggestions(suggestions, input, selectedTags, limit = 7) {
  const q = normalizeTagText(input).toLowerCase();
  if (!q) return [];
  const maxItems = clampInteger(limit, { min: 1, fallback: DEFAULT_TAG_SUGGESTION_LIMIT });

  return normalizeTagSuggestions(suggestions, selectedTags)
    .filter(tag => tag.toLowerCase().includes(q))
    .slice(0, maxItems);
}

export function normalizeTagInputOnChange(onChange) {
  return typeof onChange === 'function' ? onChange : noop;
}
