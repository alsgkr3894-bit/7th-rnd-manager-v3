import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  cleanPlatformsForSave,
  initPlatformSettingsState,
  platformSettingsReducer,
} from '../../components/cost/margin/platform-settings/platformSettingsState.js';

const modalSource = readFileSync(
  resolve('components/cost/margin/PlatformSettingsModal.jsx'),
  'utf8'
);
const selectorSource = readFileSync(
  resolve('components/cost/margin/platform-settings/PlatformSelector.jsx'),
  'utf8'
);
const editorSource = readFileSync(
  resolve('components/cost/margin/platform-settings/PlatformEditorPanel.jsx'),
  'utf8'
);
const shellSource = readFileSync(
  resolve('components/cost/margin/platform-settings/PlatformSettingsShell.jsx'),
  'utf8'
);
const stateSource = readFileSync(
  resolve('components/cost/margin/platform-settings/platformSettingsState.js'),
  'utf8'
);

describe('platform settings modal structure', () => {
  test('PlatformSettingsModal delegates shell, selector, editor, and state helpers', () => {
    expect(modalSource).toContain('<PlatformSettingsShell');
    expect(modalSource).toContain('<PlatformSelector');
    expect(modalSource).toContain('<PlatformEditorPanel');
    expect(modalSource).toContain('platformSettingsReducer');
    expect(modalSource).toContain('cleanPlatformsForSave');
    expect(modalSource).not.toContain('createPortal');
    expect(modalSource).not.toContain('function PlatformRow');
    expect(modalSource).not.toContain('<FeeRow');
    expect(modalSource).not.toContain('parseFloat');
    expect(modalSource.split('\n').length).toBeLessThanOrEqual(70);

    expect(selectorSource).toContain('function PlatformRow');
    expect(selectorSource).toContain('플랫폼 추가');
    expect(editorSource).toContain('export function PlatformEditorPanel');
    expect(editorSource).toContain('<FeeRow');
    expect(editorSource).toContain('기본은 수수료 없이 판매가 그대로 마진을 계산합니다.');
    expect(shellSource).toContain('export function PlatformSettingsShell');
    expect(shellSource).toContain('createPortal');
    expect(shellSource).toContain('플랫폼 수수료 설정');
    expect(stateSource).toContain('export function platformSettingsReducer');
    expect(stateSource).toContain('export function cleanPlatformsForSave');
  });

  test('state helpers clone, reduce, and clean platform fees for saving', () => {
    const initial = [
      { id: 'default', name: '기본', fees: [] },
      {
        id: 'delivery',
        name: ' 배달앱 ',
        fees: [
          { id: 'blank', label: ' ', type: 'fixed', value: '', sizeOverrides: {} },
          {
            id: 'fixed',
            label: ' 배달비 ',
            type: 'fixed',
            value: '3000',
            sizeOverrides: { L: '3500', R: '0' },
          },
          { id: 'pct', label: ' 수수료 ', type: 'pct', value: '7.5', sizeOverrides: { L: '999' } },
        ],
      },
    ];

    const state = initPlatformSettingsState(initial);
    expect(state.selId).toBe('default');
    expect(state.plats[1].fees[1]).not.toBe(initial[1].fees[1]);
    expect(state.plats[1].fees[1].sizeOverrides).not.toBe(initial[1].fees[1].sizeOverrides);

    const selected = platformSettingsReducer(state, { type: 'SET_SEL', id: 'delivery' });
    const renamed = platformSettingsReducer(selected, { type: 'SET_PLAT_NAME', name: '  쿠팡  ' });
    const patched = platformSettingsReducer(renamed, {
      type: 'PATCH_SIZE_OVERRIDE',
      id: 'fixed',
      key: 'R',
      val: '2500',
    });
    const added = platformSettingsReducer(patched, { type: 'ADD_FEE' });
    expect(added.plats.find(platform => platform.id === 'delivery').name).toBe('  쿠팡  ');
    expect(added.plats.find(platform => platform.id === 'delivery').fees).toHaveLength(4);

    expect(cleanPlatformsForSave(patched.plats)).toEqual([
      { id: 'default', name: '기본', fees: [] },
      {
        id: 'delivery',
        name: '쿠팡',
        fees: [
          {
            id: 'fixed',
            label: '배달비',
            type: 'fixed',
            value: 3000,
            sizeOverrides: { L: 3500, R: 2500 },
          },
          { id: 'pct', label: '수수료', type: 'pct', value: 7.5 },
        ],
      },
    ]);
  });
});
