import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  countIngredientPhotos,
  getPrimaryIngredientPhoto,
  normalizeIngredientPhotos,
} from '../../lib/ingredient/photos.js';

const controllerSource = readFileSync(
  resolve('app/ingredient/manage/useIngredientFormController.js'),
  'utf8'
);
const photoSectionSource = readFileSync(
  resolve('app/ingredient/manage/IngredientPhotoSection.jsx'),
  'utf8'
);

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

  test('ingredient photo upload validates before resize and resets the file input', () => {
    expect(controllerSource).toContain('import { imageFileError, resizePhoto }');
    expect(controllerSource).toContain('const error = imageFileError(file);');
    expect(controllerSource.indexOf('const error = imageFileError(file);')).toBeLessThan(
      controllerSource.indexOf('const photo = await resizePhoto(file);')
    );
    expect(controllerSource).toContain("showToast(error, 'warn')");
    expect(photoSectionSource).toContain('accept="image/*"');
    expect(photoSectionSource).toContain('onPhotoFile(slot.key, e.target.files?.[0]);');
    expect(photoSectionSource).toContain("e.target.value = '';");
  });
});
