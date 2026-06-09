import { asDisplayText } from './prop-guards';

export const DEFAULT_SEARCH_PLACEHOLDER = '제품명·제품코드 검색';

const noop = () => {};

export function normalizeSearchBoxValue(value) {
  return asDisplayText(value);
}

export function normalizeSearchBoxPlaceholder(placeholder) {
  return asDisplayText(placeholder, DEFAULT_SEARCH_PLACEHOLDER);
}

export function normalizeSearchBoxOnChange(onChange) {
  return typeof onChange === 'function' ? onChange : noop;
}

export function getSearchBoxRightPadding(value) {
  return normalizeSearchBoxValue(value) ? 32 : 12;
}
