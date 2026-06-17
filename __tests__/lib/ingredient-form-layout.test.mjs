import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(process.cwd(), 'app/ingredient/manage/IngredientForm.jsx'),
  'utf-8'
);

describe('IngredientForm 레이아웃 구조', () => {
  test('createPortal을 사용한다', () => {
    expect(src).toContain('createPortal');
    expect(src).toContain('document.body');
  });

  test('카드 폭이 820px 이상으로 넓어졌다', () => {
    expect(src).toContain('820px');
  });

  test('카드에 flex column 레이아웃이 있다', () => {
    expect(src).toContain('flexDirection');
    expect(src).toContain('column');
  });

  test('sticky 헤더에 background:var(--surface)가 있다', () => {
    expect(src).toContain("background: 'var(--surface)'");
  });

  test('스크롤 본문에 overflowY auto와 flex 1이 있다', () => {
    expect(src).toContain("overflowY: 'auto'");
    expect(src).toContain("flex: 1");
    expect(src).toContain("minHeight: 0");
  });

  test('sticky 푸터에 취소/저장 버튼이 있다', () => {
    // 푸터 borderTop + 버튼이 있어야 함
    expect(src).toContain("borderTop: '1px solid var(--divider)'");
    expect(src).toContain('취소');
    expect(src).toContain('추가');
    expect(src).toContain('저장 중…');
  });

  test('PhotoSection이 AllergenSection 이후에 위치한다', () => {
    const allergenIdx = src.indexOf('<AllergenSection');
    const photoIdx = src.indexOf('<PhotoSection');
    expect(allergenIdx).toBeGreaterThan(-1);
    expect(photoIdx).toBeGreaterThan(allergenIdx);
  });

  test('BasicIngredientFields가 IngredientNameField 이후에 위치한다', () => {
    const nameIdx = src.indexOf('<IngredientNameField');
    const basicIdx = src.indexOf('<BasicIngredientFields');
    expect(nameIdx).toBeGreaterThan(-1);
    expect(basicIdx).toBeGreaterThan(nameIdx);
  });

  test('저장 payload 로직(handleSubmit)은 변경되지 않았다', () => {
    expect(src).toContain('normalizeIngredientPhotos');
    expect(src).toContain('getPrimaryIngredientPhoto');
    expect(src).toContain('await onSave(data)');
    expect(src).toContain('setLastUnitType');
  });

  test('배경 클릭 시 닫기 핸들러가 있다', () => {
    expect(src).toContain('e.target === e.currentTarget');
  });

  test('제때 연동 항목용 직접 수정 가능 섹션 구분자가 있다', () => {
    expect(src).toContain('직접 수정 가능한 항목');
  });
});
