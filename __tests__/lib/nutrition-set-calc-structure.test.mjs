import { readFileSync } from 'fs';
import { resolve } from 'path';

const tabSource = readFileSync(resolve('components/nutrition/menu/TabSetCalc.jsx'), 'utf8');
const halfSource = readFileSync(
  resolve('components/nutrition/menu/set-calc/HalfAndHalfCard.jsx'),
  'utf8'
);
const listSource = readFileSync(
  resolve('components/nutrition/menu/set-calc/SetCompositionList.jsx'),
  'utf8'
);
const modalSource = readFileSync(
  resolve('components/nutrition/menu/set-calc/SetCompositionModal.jsx'),
  'utf8'
);
const slotSource = readFileSync(
  resolve('components/nutrition/menu/set-calc/SlotEditor.jsx'),
  'utf8'
);
const formatSource = readFileSync(resolve('components/nutrition/menu/set-calc/format.js'), 'utf8');
const hookSource = readFileSync(resolve('hooks/useSetCompositionForm.js'), 'utf8');

describe('nutrition set calc structure', () => {
  test('TabSetCalc keeps calculation wiring and delegates focused UI sections', () => {
    expect(tabSource).toContain('<HalfAndHalfCard');
    expect(tabSource).toContain('<SetCompositionList');
    expect(tabSource).toContain('<SetCompositionModal');
    expect(tabSource).toContain('calcHalfMinMax');
    expect(tabSource).toContain('calcSetMinMax');
    expect(tabSource).toContain('useSetCompositionForm');
    expect(tabSource).not.toContain('function SlotEditor');
    expect(tabSource).not.toContain('function KcalCard');
    expect(tabSource).not.toContain('<ModalFrame');
    expect(tabSource).not.toContain('피자 후보 총열량 높은순');
    expect(tabSource).not.toContain('메뉴명 또는 코드로 검색…');
  });

  test('하프앤하프는 1인용 피자를 후보에서 제외하고, 세트박스 피자 슬롯은 그대로 둔다', () => {
    expect(tabSource).toContain('isPersonalPizzaMenu');
    expect(tabSource).toContain(
      'pizzaMenus.filter(m => !isPersonalPizzaMenu(m, masterByCode))'
    );
    expect(tabSource).toContain('calcHalfMinMax(halfPizzaMenus, safeRawMap, safeEdgeMap)');
    expect(tabSource).toContain('<HalfAndHalfCard pizzaMenus={halfPizzaMenus}');
    // 세트박스(calcSetMinMax)는 여전히 1인용 포함 pizzaMenus를 그대로 쓴다.
    expect(tabSource.replace(/\s+/g, ' ')).toContain(
      'masterByCode, pizzaMenus, safeEdgeMap'
    );
    expect(tabSource).toContain('pizzaMenus={pizzaMenus}'); // SetCompositionModal도 1인용 포함
  });

  test('set calc child components own cards, modal, slot editor, and kcal formatting', () => {
    expect(halfSource).toContain('export function HalfAndHalfCard');
    expect(halfSource).toContain('function KcalCard');
    expect(halfSource).toContain('피자 후보 총열량 높은순');
    expect(halfSource).toContain('THIN_CRUST_LABEL');
    expect(listSource).toContain('export function SetCompositionList');
    expect(listSource).toContain('세트 구성이 없어요');
    expect(listSource).toContain('formatKcalRange(comp.selectedResult)');
    expect(modalSource).toContain('export function SetCompositionModal');
    expect(modalSource).toContain('<ModalFrame');
    expect(modalSource).toContain('<SlotEditor');
    expect(slotSource).toContain('export function SlotEditor');
    expect(slotSource).toContain('메뉴명 또는 코드로 검색…');
    expect(slotSource).toContain('검색 결과 없음');
    expect(formatSource).toContain('export const formatKcal');
    expect(formatSource).toContain('export const formatKcalRange');
  });

  test('세트 추가/편집 시 L세트·R세트 구성품을 한 번에 입력하고 각 사이즈 열량을 함께 보여준다', () => {
    // TabSetCalc: 세트명 기준으로 L/R 레코드를 하나의 그룹으로 묶어 리스트/모달에 전달한다.
    expect(tabSource).toContain('groupedSets');
    expect(tabSource).toContain('groups={groupedSets}');
    expect(tabSource.replace(/\s+/g, ' ')).toContain(
      "if (!map.has(key)) map.set(key, { setName: key, L: null, R: null }); map.get(key)[comp.setSide] = comp;"
    );

    // SetCompositionList: 세트명 하나의 카드에서 L/R 열량을 동시에 표시하고, 편집/삭제는 그룹 단위로 동작한다.
    expect(listSource).toContain('export function SetCompositionList');
    expect(listSource).toContain('groups.map((group, index)');
    expect(listSource).toContain('onEdit(group)');
    expect(listSource).toContain('onDelete(group)');
    expect(listSource).toContain("group[side]");
    expect(listSource).toContain('formatKcalRange(comp.selectedResult)');

    // SetCompositionModal: L/R 슬롯 편집기를 나란히 렌더링하고 각 사이드별 미리보기를 계산한다.
    expect(modalSource).toContain('export function SetCompositionModal');
    expect(modalSource).toContain("const SIDES = ['L', 'R'];");
    expect(modalSource).toContain('SIDES.map(side =>');
    expect(modalSource).toContain('onAddSlot(side)');
    expect(modalSource).toContain('onUpdateSlot(side, index, patch)');
    expect(modalSource).toContain('onRemoveSlot(side, index)');
    expect(modalSource).toContain('<ModalFrame');
    expect(modalSource).toContain('<SlotEditor');

    // useSetCompositionForm: side별 슬롯 상태를 관리하고 저장 시 L/R 레코드를 함께 upsert한다.
    expect(hookSource).toContain('L: emptySide(), R: emptySide()');
    expect(hookSource).toContain('addSlot = side =>');
    expect(hookSource).toContain('removeSlot = (side, i) =>');
    expect(hookSource).toContain('updateSlot = (side, i, patch) =>');
    expect(hookSource).toContain("['L', 'R'].map(side => {");
    expect(hookSource).toContain('upsertSetComposition({');
  });

  test('구성품은 별도 이름 입력 없이 메뉴 검색으로만 추가하고, 부분 수량(qty/baseQty)으로 영양값 비율을 반영한다', () => {
    // 슬롯 생성 시 label 없이 menuCodes만 가진다 — 이름은 선택한 메뉴명으로 대체된다.
    expect(hookSource).toContain("slots: [...(Array.isArray(f[side].slots) ? f[side].slots : []), { menuCodes: [] }]");
    expect(hookSource).not.toContain("label: ''");

    // SlotEditor: 별도 '구성품 이름' 입력 없이 세트 수량/기준 수량만 입력받는다.
    expect(slotSource).not.toContain('구성품 이름');
    expect(slotSource).not.toContain('onChange({ label:');
    expect(slotSource).toContain("onChange({ qty: event.target.value })");
    expect(slotSource).toContain("onChange({ baseQty: event.target.value })");
    expect(slotSource).toContain('placeholder="세트 수량"');
    expect(slotSource).toContain('placeholder="기준 수량"');

    // SetCompositionList: 슬롯 표시는 menuCodes → 메뉴명 변환 + qty/baseQty 주석으로 구성한다.
    expect(listSource).toContain('function slotDisplayText(slot, nameByCode)');
    expect(listSource).toContain('slotDisplayText(slot, nameByCode)');
    expect(listSource).not.toContain("asDisplayText(slot?.label, '구성품')");
    expect(listSource).toContain('({ groups, menus, onAdd, onEdit, onDelete, canEdit = false })');
    expect(tabSource).toContain('menus={safeMenus}');

    // set-calc.js: 슬롯 비율(qty/baseQty)이 min/max 합산에 곱해진다.
    const setCalcSource = readFileSync(
      resolve('lib/nutrition/values/set-calc.js'),
      'utf8'
    );
    expect(setCalcSource).toContain('function slotRatio(slot)');
    expect(setCalcSource.replace(/\s+/g, ' ')).toContain(
      'slotMin += Math.min(...kcals) * ratio;'
    );
    expect(setCalcSource.replace(/\s+/g, ' ')).toContain(
      'slotMax += Math.max(...kcals) * ratio;'
    );
  });

  test('set composition write controls follow canEdit role state', () => {
    expect(tabSource).toContain('canEdit = false');
    expect(tabSource).toContain('useSetCompositionForm({ onRefresh: refresh, canEdit })');
    expect(tabSource).toContain('canEdit && modal');
    expect(listSource).toContain('canEdit = false');
    expect(listSource).toContain('disabled={!canEdit}');
    expect(hookSource).toContain('canEdit = false');
    expect(hookSource).toContain('if (!canEdit) return');
  });
});
