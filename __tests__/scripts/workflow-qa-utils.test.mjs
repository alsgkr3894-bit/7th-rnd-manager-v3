import { describe, expect, test } from '@jest/globals';
import {
  scenarioPassed,
  summarizeScenarios,
  firstFailedStep,
  isValidBackupShape,
  formatStepLine,
} from '../../scripts/workflow-qa-utils.mjs';
import { workflowScenarios } from '../../scripts/workflow/scenarios/index.mjs';

describe('scenarioPassed', () => {
  test('모든 스텝 ok면 true', () => {
    expect(scenarioPassed([{ ok: true }, { ok: true }])).toBe(true);
  });
  test('하나라도 실패면 false', () => {
    expect(scenarioPassed([{ ok: true }, { ok: false }])).toBe(false);
  });
  test('빈 배열/비배열은 false', () => {
    expect(scenarioPassed([])).toBe(false);
    expect(scenarioPassed(null)).toBe(false);
  });
});

describe('summarizeScenarios', () => {
  test('통과/전체 집계', () => {
    const scenarios = [
      { name: 'a', steps: [{ ok: true }] },
      { name: 'b', steps: [{ ok: true }, { ok: false }] },
      { name: 'c', steps: [{ ok: true }, { ok: true }] },
    ];
    expect(summarizeScenarios(scenarios)).toEqual({ passed: 2, total: 3 });
  });
});

describe('firstFailedStep', () => {
  test('첫 실패 스텝 반환', () => {
    const steps = [
      { ok: true, label: 'a' },
      { ok: false, label: 'b' },
      { ok: false, label: 'c' },
    ];
    expect(firstFailedStep(steps)?.label).toBe('b');
  });
  test('전부 통과면 null', () => {
    expect(firstFailedStep([{ ok: true }])).toBeNull();
  });
});

describe('isValidBackupShape', () => {
  test('stores 객체 보유 시 true', () => {
    expect(isValidBackupShape({ stores: {} })).toBe(true);
    expect(isValidBackupShape({ version: 'v3', stores: { menu_master: [] } })).toBe(true);
  });
  test('stores 없거나 배열/원시값은 false', () => {
    expect(isValidBackupShape({})).toBe(false);
    expect(isValidBackupShape({ stores: [] })).toBe(false);
    expect(isValidBackupShape([])).toBe(false);
    expect(isValidBackupShape(null)).toBe(false);
    expect(isValidBackupShape('x')).toBe(false);
  });
});

describe('formatStepLine', () => {
  test('성공 스텝은 체크 마크', () => {
    expect(formatStepLine({ ok: true, label: '저장' })).toContain('✓ 저장');
  });
  test('실패 스텝은 X + 사유', () => {
    const line = formatStepLine({ ok: false, label: '저장', error: 'timeout' });
    expect(line).toContain('✗ 저장');
    expect(line).toContain('timeout');
  });
});

describe('workflowScenarios', () => {
  test('업무 시나리오 순서를 유지한다', () => {
    expect(workflowScenarios.map(fn => fn.name)).toEqual([
      'scenarioBackupRestorePreview',
      'scenarioNoteCreate',
      'scenarioMenuMasterCreate',
      'scenarioViewerBlocking',
      'scenarioInvalidBackup',
      'scenarioMenuFormValidation',
      'scenarioBrandIsolation',
      'scenarioCalendarSchedule',
      'scenarioIngredientCreate',
      'scenarioCostMargin',
      'scenarioSalesUpload',
      'scenarioNutritionMenu',
      'scenarioRecipeCostMargin',
      'scenarioIngredientPriceReport',
      'scenarioCommonCost',
      'scenarioRecipeSaveUI',
    ]);
  });
});
