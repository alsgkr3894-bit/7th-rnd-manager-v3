'use client';

import { useEffect, useState } from 'react';
import { getSetting, SETTING_CHANGED_EVENT, settingStorageKey } from '@/lib/settings';

export function useSettingValue(key) {
  const [value, setValue] = useState(() => getSetting(key));

  useEffect(() => {
    const sync = () => setValue(getSetting(key));
    const onSettingChanged = event => {
      if (!event?.detail?.key || event.detail.key === key) sync();
    };
    const onStorage = event => {
      if (event.key === settingStorageKey(key)) sync();
    };

    sync();
    window.addEventListener(SETTING_CHANGED_EVENT, onSettingChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SETTING_CHANGED_EVENT, onSettingChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [key]);

  return value;
}
