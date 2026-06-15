import { COMMON_LS_KEYS } from '../../lib/backup/local-storage-keys.js';
import { ALL_STORES } from '../../lib/db/constants.js';
import {
  COMMON_STORES,
  LEGACY_RESERVED_STORES,
  LEGACY_RESERVED_STORE_SET,
  storesForScopes,
} from '../../lib/db/module-stores.js';
import { SETTING_LS_KEYS } from '../../lib/settings.js';

describe('settings store role guards', () => {
  test('IndexedDB settings store is kept only as a legacy/reserved store', () => {
    expect(ALL_STORES).toContain('settings');
    expect(LEGACY_RESERVED_STORES).toEqual(['settings']);
    expect(LEGACY_RESERVED_STORE_SET.has('settings')).toBe(true);
    expect(COMMON_STORES).not.toContain('settings');
    expect(storesForScopes(['sales', 'cost'])).not.toContain('settings');
  });

  test('system settings are backed up through localStorage keys', () => {
    expect(SETTING_LS_KEYS.length).toBeGreaterThan(0);
    expect(COMMON_LS_KEYS).toEqual(expect.arrayContaining(SETTING_LS_KEYS));
  });
});
