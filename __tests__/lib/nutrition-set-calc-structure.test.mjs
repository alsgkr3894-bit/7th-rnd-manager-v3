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
});
