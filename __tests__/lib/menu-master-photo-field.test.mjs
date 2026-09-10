import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

/**
 * 메뉴마스터 사진(단일 슬롯) 배선 확인.
 * 저장 형태는 lib/image/resize.js와 동일한 base64 JPEG data URL — 식자재
 * 3-슬롯(lib/ingredient/photos.js)과 달리 메뉴는 완성 사진 1장으로 시작한다.
 */
describe('메뉴마스터 사진 필드', () => {
  test('store.js buildRecord가 photo를 명시됐을 때만 반영한다(시드/동기화 보호)', () => {
    const s = src('lib/menu-master/store.js');
    expect(s).toContain('if (data.photo !== undefined)');
    expect(s).toContain('rec.photo = data.photo && data.photo.data ? data.photo : null');
  });

  test('MenuMasterPhotoField는 resizePhoto로 base64 JPEG를 만든다', () => {
    const s = src('components/menu-master/MenuMasterPhotoField.jsx');
    expect(s).toContain("from '@/lib/image/resize'");
    expect(s).toContain('resizePhoto(file)');
    expect(s).toContain('isSupportedImageFile');
  });

  test('수정 모달이 photo를 폼 상태·저장 payload에 연결한다', () => {
    const s = src('components/menu-master/MenuMasterEditModal.jsx');
    expect(s).toContain('photo: row?.photo && row.photo.data ? row.photo : null');
    expect(s).toContain('photo: form.photo');
  });

  test('편집 필드와 목록 행에 사진 UI가 연결돼 있다', () => {
    const fields = src('components/menu-master/MenuMasterEditFields.jsx');
    expect(fields).toContain('MenuMasterPhotoField');

    const row = src('components/menu-master/MenuMasterTableRow.jsx');
    expect(row).toContain('row.photo?.data');
  });
});
