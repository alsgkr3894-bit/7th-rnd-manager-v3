export const INGREDIENT_PHOTO_SLOTS = [
  {
    key: 'packaging',
    label: '제품 포장사진',
    shortLabel: '포장',
    hint: '박스, 봉투, 외포장',
  },
  {
    key: 'detail',
    label: '제품 상세정보사진',
    shortLabel: '상세정보',
    hint: '라벨, 원재료, 규격 정보',
  },
  {
    key: 'actual',
    label: '제품 실물사진',
    shortLabel: '실물',
    hint: '개봉 후 실제 식자재',
  },
];

export const INGREDIENT_PHOTO_KEYS = INGREDIENT_PHOTO_SLOTS.map(slot => slot.key);

export function normalizeIngredientPhoto(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !value.data) return null;
  return {
    data: String(value.data),
    name: String(value.name || ''),
  };
}

export function normalizeIngredientPhotos(value, legacyPhoto = null) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const photos = {};
  for (const key of INGREDIENT_PHOTO_KEYS) {
    photos[key] = normalizeIngredientPhoto(source[key]);
  }
  if (!photos.packaging) {
    photos.packaging = normalizeIngredientPhoto(legacyPhoto);
  }
  return photos;
}

export function getIngredientPhoto(row, key) {
  if (!INGREDIENT_PHOTO_KEYS.includes(key)) return null;
  return normalizeIngredientPhotos(row?.photos, row?.photo)[key];
}

export function getPrimaryIngredientPhoto(row) {
  const photos = normalizeIngredientPhotos(row?.photos, row?.photo);
  return photos.packaging || photos.detail || photos.actual || null;
}

export function countIngredientPhotos(row) {
  const photos = normalizeIngredientPhotos(row?.photos, row?.photo);
  return INGREDIENT_PHOTO_KEYS.reduce((sum, key) => sum + (photos[key] ? 1 : 0), 0);
}
