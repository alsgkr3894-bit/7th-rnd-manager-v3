import { imageFileError, isSupportedImageFile, resizePhotos } from '../../lib/image/resize.js';

const ORIGINAL_FILE = globalThis.File;

class TestFile {
  constructor({ name = 'photo.jpg', type = 'image/jpeg', size = 1000 } = {}) {
    this.name = name;
    this.type = type;
    this.size = size;
  }
}

describe('image resize guards', () => {
  beforeEach(() => {
    globalThis.File = TestFile;
  });

  afterEach(() => {
    globalThis.File = ORIGINAL_FILE;
  });

  test('이미지 파일을 허용하고 SVG는 거부', () => {
    expect(isSupportedImageFile(new TestFile({ name: 'photo.png', type: 'image/png' }))).toBe(true);
    expect(isSupportedImageFile(new TestFile({ name: 'vector.svg', type: 'image/svg+xml' }))).toBe(false);
  });

  test('MIME이 비어도 지원 확장자면 허용', () => {
    expect(isSupportedImageFile(new TestFile({ name: 'sample.heic', type: '' }))).toBe(true);
  });

  test('비파일과 큰 파일은 명확한 에러 메시지를 반환', () => {
    expect(imageFileError(null)).toBe('파일 형식이 올바르지 않습니다');
    expect(imageFileError(new TestFile({ name: 'doc.txt', type: 'text/plain' }))).toBe('지원하지 않는 이미지 형식입니다');
    expect(imageFileError(new TestFile({ size: 6 * 1024 * 1024 }))).toContain('5MB를 초과');
  });

  test('빈 입력 목록은 빈 배열로 처리', async () => {
    await expect(resizePhotos(null)).resolves.toEqual([]);
  });
});
