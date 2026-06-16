import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildSampleDetailModel,
  getCurrentPhotoState,
  normalizeSampleDetailActions,
} from '../../app/note/sample/detail-modal/sampleDetailModalUtils.js';

const modalSource = readFileSync(resolve('app/note/sample/_SampleDetailModal.jsx'), 'utf8');
const shellSource = readFileSync(
  resolve('app/note/sample/detail-modal/SampleDetailShell.jsx'),
  'utf8'
);
const headerSource = readFileSync(
  resolve('app/note/sample/detail-modal/SampleDetailHeader.jsx'),
  'utf8'
);
const photoSource = readFileSync(
  resolve('app/note/sample/detail-modal/SampleDetailPhotoPanel.jsx'),
  'utf8'
);
const bodySource = readFileSync(
  resolve('app/note/sample/detail-modal/SampleDetailBody.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('app/note/sample/detail-modal/sampleDetailModalUtils.js'),
  'utf8'
);

describe('sample detail modal helpers', () => {
  test('buildSampleDetailModel normalizes display fields and clamps unsafe values', () => {
    const model = buildSampleDetailModel({
      title: null,
      sampleNames: ['포테이토 피자', ''],
      photos: [{ data: 'data:image/png;base64,a' }, { data: '' }, null],
      tags: ' 시식, 개선 , ,',
      rating: 9,
      price: '12000',
      priceTaxType: 'excl',
      description: 123,
      result: { invalid: true },
    });

    expect(model.title).toBe('제목 없음');
    expect(model.names).toBe('포테이토 피자');
    expect(model.photos).toHaveLength(1);
    expect(model.tags).toEqual(['시식', '개선']);
    expect(model.rating).toBe(5);
    expect(model.price).toBe(12000);
    expect(model.priceLabel).toBe('12,000원 (부가세 별도)');
    expect(model.description).toBe('123');
    expect(model.result).toBe('');
  });

  test('photo state clamps the selected index to the available photo range', () => {
    const photos = [{ data: 'first' }, { data: 'second' }];

    expect(getCurrentPhotoState(photos, 99)).toEqual({
      currentPhotoIdx: 1,
      currentPhoto: photos[1],
    });
    expect(getCurrentPhotoState([], 3)).toEqual({
      currentPhotoIdx: 0,
      currentPhoto: undefined,
    });
  });

  test('action normalizer always returns callable callbacks', () => {
    const actions = normalizeSampleDetailActions({});

    expect(typeof actions.closeModal).toBe('function');
    expect(typeof actions.edit).toBe('function');
    expect(typeof actions.remove).toBe('function');
  });
});

describe('sample detail modal structure', () => {
  test('SampleDetailModal keeps state and routing while delegating rendering sections', () => {
    expect(modalSource).toContain('export function SampleDetailModal');
    expect(modalSource).toContain('buildSampleDetailModel(sample)');
    expect(modalSource).toContain('getCurrentPhotoState(model.photos, photoIdx)');
    expect(modalSource).toContain('normalizeSampleDetailActions({');
    expect(modalSource).toContain('<SampleDetailShell');
    expect(modalSource).toContain('<SampleDetailHeader');
    expect(modalSource).toContain('<SampleDetailPhotoPanel');
    expect(modalSource).toContain('<SampleDetailBody');
    expect(modalSource).toContain('router.push(MENU_MASTER_ROUTE)');
    expect(modalSource).not.toContain('sampleNamesText');
    expect(modalSource).not.toContain('asObjectArray');
    expect(modalSource).not.toContain('<Stars');
    expect(modalSource).not.toContain('Icon.close');
    expect(modalSource).not.toContain('photos.map');
    expect(modalSource).not.toContain('상세 내용이 없습니다.');
  });

  test('split modal files own shell, header, photo, body, and view model details', () => {
    expect(shellSource).toContain('export function SampleDetailShell');
    expect(shellSource).toContain('modal-anim');
    expect(shellSource).toContain('modal-exit');
    expect(shellSource).not.toContain('gridTemplateColumns');

    expect(headerSource).toContain('export function SampleDetailHeader');
    expect(headerSource).toContain('function SampleDetailBadges');
    expect(headerSource).toContain('function SampleDetailMeta');
    expect(headerSource).toContain('<Stars');
    expect(headerSource).toContain('메뉴 마스터');
    expect(headerSource).toContain('Icon.close');

    expect(photoSource).toContain('export function SampleDetailPhotoPanel');
    expect(photoSource).toContain('function PhotoNavButton');
    expect(photoSource).toContain('function SamplePhotoThumbnails');
    expect(photoSource).toContain('aria-label={label}');
    expect(photoSource).toContain('테스트 사진');
    expect(photoSource).toContain('photos.map');

    expect(bodySource).toContain('export function SampleDetailBody');
    expect(bodySource).toContain('function SampleDetailSection');
    expect(bodySource).toContain('function SampleDetailTags');
    expect(bodySource).toContain('테스트 내용 / 조건');
    expect(bodySource).toContain('상세 내용이 없습니다.');

    expect(utilsSource).toContain('sampleNamesText');
    expect(utilsSource).toContain('clampInteger');
    expect(utilsSource).toContain('priceLabel');
  });
});
