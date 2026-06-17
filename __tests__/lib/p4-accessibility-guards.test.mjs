/**
 * P4 접근성/포커스 회귀 점검
 * 모달 Esc, aria-busy, role=alert, 버튼 시맨틱스 구조 검증
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ingredientFormSrc = readFileSync(
  resolve(process.cwd(), 'app/ingredient/manage/IngredientForm.jsx'),
  'utf-8'
);
const menuModalSrc = readFileSync(
  resolve(process.cwd(), 'components/menu-master/MenuMasterEditModal.jsx'),
  'utf-8'
);
const tableRowSrc = readFileSync(
  resolve(process.cwd(), 'components/menu-master/MenuMasterTableRow.jsx'),
  'utf-8'
);
const fieldPrimSrc = readFileSync(
  resolve(process.cwd(), 'app/ingredient/manage/IngredientFieldPrimitives.jsx'),
  'utf-8'
);

describe('IngredientForm 접근성', () => {
  test('Esc 키로 모달을 닫는 keydown 핸들러가 있다', () => {
    expect(ingredientFormSrc).toContain('Escape');
    expect(ingredientFormSrc).toContain('keydown');
  });

  test('저장 중 aria-busy 속성이 있다', () => {
    expect(ingredientFormSrc).toContain('aria-busy={saving}');
  });

  test('Cmd+S 저장 단축키(useKeyboardSave)가 연결되어 있다', () => {
    expect(ingredientFormSrc).toContain('useKeyboardSave');
  });

  test('createPortal로 body에 렌더링된다', () => {
    expect(ingredientFormSrc).toContain('createPortal');
    expect(ingredientFormSrc).toContain('document.body');
  });
});

describe('MenuMasterEditModal 접근성', () => {
  test('Esc 키로 모달을 닫는 keydown 핸들러가 있다', () => {
    expect(menuModalSrc).toContain('Escape');
    expect(menuModalSrc).toContain('keydown');
  });

  test('Cmd+S 저장 단축키(useKeyboardSave)가 연결되어 있다', () => {
    expect(menuModalSrc).toContain('useKeyboardSave');
  });

  test('createPortal로 body에 렌더링된다', () => {
    expect(menuModalSrc).toContain('createPortal');
    expect(menuModalSrc).toContain('document.body');
  });
});

describe('MenuMasterTableRow 버튼 시맨틱스', () => {
  test('메뉴명 셀 클릭 편집이 button type="button"으로 구현된다', () => {
    expect(tableRowSrc).toContain('type="button"');
  });

  test('viewer 권한에서 메뉴명 클릭 편집이 비활성화된다', () => {
    expect(tableRowSrc).toContain('isViewer ?');
  });

  test('수정 버튼이 isViewer일 때 disabled된다', () => {
    const matches = (tableRowSrc.match(/disabled=\{isViewer\}/g) || []).length;
    expect(matches).toBeGreaterThanOrEqual(2);
  });
});

describe('IngredientFieldPrimitives 오류 표시', () => {
  test('에러 메시지에 role="alert"가 있다', () => {
    expect(fieldPrimSrc).toContain('role="alert"');
  });

  test('에러 메시지에 id 연결(errorId)이 있다', () => {
    expect(fieldPrimSrc).toContain('id={errorId}');
  });

  test('필수 필드에 시각적 required 표시(*)가 있다', () => {
    expect(fieldPrimSrc).toContain('required');
    expect(fieldPrimSrc).toContain('var(--negative)');
  });
});
