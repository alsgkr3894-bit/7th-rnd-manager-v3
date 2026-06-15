import { KEYS } from '@/lib/note/keys';
import { setLS, tryLS } from '@/lib/note/storage';
import {
  SAMPLE_RATING_KEYS,
  SAMPLE_SORT_KEYS,
  SAMPLE_VIEW_KEYS,
  pickAllowed,
} from './samplePageStateUtils';

export function readSampleCatFilter(searchParams) {
  return searchParams?.get?.('cat') || 'all';
}

export function readSampleRatingMin(searchParams) {
  const value = parseInt(searchParams?.get?.('r') || '0', 10);
  return pickAllowed(value, SAMPLE_RATING_KEYS, 0);
}

export function readSampleSortBy() {
  return pickAllowed(tryLS(KEYS.SAMPLE_SORT, 'createdAt'), SAMPLE_SORT_KEYS, 'createdAt');
}

export function readSampleViewMode() {
  return pickAllowed(tryLS(KEYS.SAMPLE_VIEW, 'grid'), SAMPLE_VIEW_KEYS, 'grid');
}

export function buildSampleFilterQuery({ catFilter, ratingMin }) {
  const params = new URLSearchParams();
  if (catFilter !== 'all') params.set('cat', catFilter);
  if (ratingMin !== 0) params.set('r', String(ratingMin));
  return params.toString();
}

export function buildSampleFilterPath({ pathname, catFilter, ratingMin }) {
  const qs = buildSampleFilterQuery({ catFilter, ratingMin });
  return qs ? `${pathname}?${qs}` : pathname;
}

export function persistSampleSortBy(key) {
  setLS(KEYS.SAMPLE_SORT, key);
}

export function persistSampleViewMode(mode) {
  setLS(KEYS.SAMPLE_VIEW, mode);
}
