import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(path) {
  return readFileSync(resolve(path), 'utf8');
}

const css = read('app/styles/features/ingredient.css');
const basicFieldSource = read('app/ingredient/manage/BasicIngredientFields.jsx');
const manualCostFieldSource = read('app/ingredient/manage/IngredientManualCostFields.jsx');
const originSectionSource = read('app/ingredient/manage/IngredientOriginSection.jsx');
const allergenSectionSource = read('app/ingredient/manage/IngredientAllergenSection.jsx');
const formSource = read('app/ingredient/manage/IngredientForm.jsx');
const panelSource = read('app/ingredient/manage/IngredientManagePanel.jsx');
const rowSource = read('components/ingredient/ManageRow.jsx');

describe('식자재 관리 UI 정리 (모달 + 목록 표 + 상단 필터)', () => {
  test('공용 CSS 클래스가 정의되어 있다', () => {
    expect(css).toMatch(/^\.ingredient-form-grid\s*\{/m);
    expect(css).toMatch(/^\.ingredient-form-section\s*\{/m);
    expect(css).toMatch(/^\.ingredient-manage-table\s+th\s*\{/m);
    expect(css).toMatch(/^\.ingredient-filter-rows\s*\{/m);
  });

  test('모달: 짧은 필드 쌍이 그리드로 묶여 있다', () => {
    expect(basicFieldSource).toContain('ingredient-form-grid');
    expect(basicFieldSource).toContain('label="분류"');
    expect(basicFieldSource).toContain('label="제조사"');
    expect(manualCostFieldSource).toContain('ingredient-form-grid');
    expect(manualCostFieldSource).toContain('label="보관 온도"');
    expect(manualCostFieldSource).toContain('label="과세구분"');
  });

  test('모달: 원산지/알레르기 섹션이 공통 클래스를 쓴다', () => {
    expect(originSectionSource).toContain('className="ingredient-form-section"');
    expect(allergenSectionSource).toContain('className="ingredient-form-section"');
    expect(originSectionSource).not.toContain("borderTop: '1px solid var(--divider)'");
    expect(allergenSectionSource).not.toContain("borderTop: '1px solid var(--divider)'");
  });

  test('모달: form에 ingredient-form 클래스가 있다', () => {
    expect(formSource).toContain('className="ingredient-form"');
  });

  test('목록 표: ingredient-manage-table 클래스가 붙어 있다', () => {
    expect(panelSource).toContain('ingredient-manage-table');
    expect(panelSource).toContain('ingredient-filter-rows');
  });

  test('목록 행: 짧은 값 칸에 줄바꿈 방지 클래스가 있다', () => {
    expect(rowSource).toContain('cell-nowrap');
  });
});
