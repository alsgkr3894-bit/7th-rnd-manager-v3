import { COMPANIES } from '@/lib/companies';
import { getProfile } from '@/lib/profile';

export const BRAND_MASTER_KEY = 'v3:brand-master';
export const BRAND_MASTER_EVENT = 'brand-master:changed';

const DEFAULT_BRAND_ID = 'main';

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeColor(value, fallback = '#E1101F') {
  const text = String(value ?? '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toUpperCase() : fallback;
}

export function normalizeBrandId(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function defaultBrands() {
  const createdAt = '2026-06-15T00:00:00.000Z';
  return COMPANIES.map(company => ({
    ...company,
    hidden: false,
    isDefault: company.id === DEFAULT_BRAND_ID,
    createdAt,
    updatedAt: createdAt,
  }));
}

function normalizeBrand(value, fallback = {}) {
  const id = normalizeBrandId(value?.id || fallback.id);
  if (!id) return null;
  const base = {
    id,
    name: cleanText(value?.name, fallback.name || id),
    sub: cleanText(value?.sub, fallback.sub || '브랜드'),
    logo: cleanText(value?.logo, fallback.logo || ''),
    color: normalizeColor(value?.color, fallback.color),
    hidden: Boolean(value?.hidden),
    isDefault: Boolean(value?.isDefault),
    createdAt: cleanText(value?.createdAt, fallback.createdAt || nowIso()),
    updatedAt: cleanText(value?.updatedAt, fallback.updatedAt || nowIso()),
  };
  if (base.id === DEFAULT_BRAND_ID) base.hidden = false;
  return base;
}

function readStoredBrands() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(BRAND_MASTER_KEY) || 'null');
    return Array.isArray(parsed?.brands) ? parsed.brands : null;
  } catch {
    return null;
  }
}

function normalizeBrands(input) {
  const defaults = defaultBrands();
  const fallbackById = new Map(defaults.map(brand => [brand.id, brand]));
  const source = Array.isArray(input) && input.length > 0 ? input : defaults;
  const byId = new Map();

  for (const item of source) {
    const fallback = fallbackById.get(normalizeBrandId(item?.id)) || {};
    const normalized = normalizeBrand(item, fallback);
    if (normalized) byId.set(normalized.id, normalized);
  }

  for (const item of defaults) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  let brands = Array.from(byId.values());
  if (!brands.some(brand => brand.id === DEFAULT_BRAND_ID)) {
    brands.unshift(defaults.find(brand => brand.id === DEFAULT_BRAND_ID));
  }

  const visibleDefaults = brands.filter(brand => !brand.hidden);
  let defaultBrand = brands.find(brand => brand.isDefault && !brand.hidden);
  if (!defaultBrand) {
    defaultBrand = visibleDefaults.find(brand => brand.id === DEFAULT_BRAND_ID) || visibleDefaults[0] || brands[0];
  }
  brands = brands.map(brand => ({
    ...brand,
    isDefault: brand.id === defaultBrand.id,
  }));

  return brands;
}

function writeBrands(brands) {
  if (typeof localStorage === 'undefined') return normalizeBrands(brands);
  const normalized = normalizeBrands(brands);
  localStorage.setItem(BRAND_MASTER_KEY, JSON.stringify({ version: 1, brands: normalized }));
  window.dispatchEvent(new CustomEvent(BRAND_MASTER_EVENT));
  return normalized;
}

export function getBrands() {
  return normalizeBrands(readStoredBrands());
}

export function getVisibleBrands() {
  return getBrands().filter(brand => !brand.hidden);
}

export function getDefaultBrandId() {
  return getBrands().find(brand => brand.isDefault && !brand.hidden)?.id || DEFAULT_BRAND_ID;
}

export function getBrandById(id, options = {}) {
  const brandId = normalizeBrandId(id);
  const brand = getBrands().find(item => item.id === brandId);
  if (!brand) return null;
  if (brand.hidden && !options.includeHidden) return null;
  return brand;
}

export function upsertBrand(patch) {
  const id = normalizeBrandId(patch?.id);
  if (!id) throw new Error('브랜드 ID가 필요합니다.');
  const brands = getBrands();
  const existing = brands.find(brand => brand.id === id);
  const now = nowIso();
  const nextBrand = normalizeBrand(
    {
      ...existing,
      ...patch,
      id,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    },
    existing
  );
  const next = existing
    ? brands.map(brand => (brand.id === id ? nextBrand : brand))
    : [...brands, nextBrand];
  return writeBrands(next);
}

export function setBrandHidden(id, hidden) {
  const brandId = normalizeBrandId(id);
  const brands = getBrands();
  const target = brands.find(brand => brand.id === brandId);
  if (!target) throw new Error('브랜드를 찾을 수 없습니다.');
  if (target.id === DEFAULT_BRAND_ID && hidden) throw new Error('기본 7번가피자는 숨길 수 없습니다.');
  if (target.isDefault && hidden) throw new Error('기본 브랜드는 숨길 수 없습니다.');
  const now = nowIso();
  return writeBrands(
    brands.map(brand => (brand.id === brandId ? { ...brand, hidden: Boolean(hidden), updatedAt: now } : brand))
  );
}

export function setDefaultBrandId(id) {
  const brandId = normalizeBrandId(id);
  const brands = getBrands();
  const target = brands.find(brand => brand.id === brandId);
  if (!target) throw new Error('브랜드를 찾을 수 없습니다.');
  if (target.hidden) throw new Error('숨김 브랜드는 기본 브랜드로 지정할 수 없습니다.');
  const now = nowIso();
  return writeBrands(
    brands.map(brand => ({
      ...brand,
      isDefault: brand.id === brandId,
      updatedAt: brand.id === brandId ? now : brand.updatedAt,
    }))
  );
}

export function isAdminProfile(profile = getProfile()) {
  return profile?.role === '관리자';
}
