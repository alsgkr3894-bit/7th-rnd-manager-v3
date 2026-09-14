import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

// 한 파일에 순수 헬퍼·작은 컴포넌트가 같이 쌓여 커진 화면들을 역할별로 나눴다.
// 되돌아가지 않게 분리 상태와 줄 수 상한을 고정한다.
describe('노트 작성 페이지 분리', () => {
  test('page는 450줄 이하, 작성 유형 상수/변환은 writeTypes.js가 갖는다', () => {
    const page = src('app/note/write/page.jsx');
    expect(page.split('\n').length).toBeLessThanOrEqual(450);
    expect(page).toContain("from './writeTypes'");
    expect(page).toContain('<WriteTypeStep');
    expect(page).not.toContain('function WriteTypeStep');
    expect(page).not.toContain('function writeTypeFromParam');

    const types = src('app/note/write/writeTypes.js');
    expect(types).toContain('export const WRITE_TYPES');
    expect(types).toContain('export const WRITE_TYPE_OPTIONS');
    expect(types).toContain('export const SAMPLE_RECORD_TYPE_BY_WRITE_TYPE');
    expect(types).toContain("export const DEFAULT_FIRST_TEST_ROUND = '1';");
    expect(types).toContain('export function withDefaultFirstTestRound');
    expect(types).toContain('export function writeTypeFromSample');
    expect(src('app/note/write/_WriteTypeStep.jsx')).toContain('export function WriteTypeStep');
  });
});

describe('샘플 복구 페이지 분리', () => {
  test('page는 200줄 이하, 복구 계획 로직은 sampleRecoveryPlan.js가 갖는다', () => {
    const page = src('app/settings/sample-recovery/page.jsx');
    expect(page.split('\n').length).toBeLessThanOrEqual(200);
    expect(page).toContain("from './sampleRecoveryPlan'");
    expect(page).not.toContain('function planRecovery');
    expect(page).not.toContain('function buildRecoveredRecord');

    const plan = src('app/settings/sample-recovery/sampleRecoveryPlan.js');
    expect(plan).toContain('export function planRecovery');
    expect(plan).toContain('export function buildRecoveredRecord');
    expect(plan).toContain('export function parsePayloadFromHash');
    expect(plan).toContain('export function duplicateKey');
    expect(plan.split('\n').length).toBeLessThanOrEqual(200);
  });
});

describe('영양성분 포스터 표 분리', () => {
  test('보드는 조립만 하고, 표는 역할별 파일로 나뉜다', () => {
    const board = src('app/nutrition/export/NutritionPosterBoard.jsx');
    expect(board.split('\n').length).toBeLessThanOrEqual(100);
    expect(board).toContain("from './_posterTables'");
    expect(board).not.toContain('function PizzaPoster150Table');
    expect(board).not.toContain('function SimplePosterTable');

    expect(src('app/nutrition/export/_posterPrimitives.jsx')).toContain('export function CellText');
    expect(src('app/nutrition/export/_posterPizzaTables.jsx')).toContain(
      'export function PizzaPoster150Table'
    );
    expect(src('app/nutrition/export/_posterTables.jsx')).toContain(
      'export function SimplePosterTable'
    );
    for (const file of [
      'app/nutrition/export/_posterPrimitives.jsx',
      'app/nutrition/export/_posterPizzaTables.jsx',
      'app/nutrition/export/_posterTables.jsx',
    ]) {
      expect(src(file).split('\n').length).toBeLessThanOrEqual(200);
    }
  });
});
