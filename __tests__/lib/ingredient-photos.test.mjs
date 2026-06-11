import {
  countIngredientPhotos,
  getPrimaryIngredientPhoto,
  normalizeIngredientPhotos,
} from '../../lib/ingredient/photos.js';

describe('ingredient photo slots', () => {
  test('legacy photo is treated as packaging photo', () => {
    const legacy = { data: 'data:image/png;base64,aaa', name: 'old.png' };
    const photos = normalizeIngredientPhotos(null, legacy);

    expect(photos.packaging).toEqual(legacy);
    expect(photos.detail).toBeNull();
    expect(photos.actual).toBeNull();
  });

  test('primary photo uses packaging, then detail, then actual', () => {
    const detail = { data: 'detail', name: 'detail.png' };
    const actual = { data: 'actual', name: 'actual.png' };

    expect(getPrimaryIngredientPhoto({ photos: { detail, actual } })).toEqual(detail);
    expect(getPrimaryIngredientPhoto({ photos: { actual } })).toEqual(actual);
  });

  test('counts all registered photo slots', () => {
    expect(
      countIngredientPhotos({
        photos: {
          packaging: { data: 'pack' },
          detail: null,
          actual: { data: 'actual' },
        },
      })
    ).toBe(2);
  });
});
