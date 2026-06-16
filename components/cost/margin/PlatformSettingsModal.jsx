'use client';
import { useReducer } from 'react';
import { PlatformEditorPanel } from './platform-settings/PlatformEditorPanel';
import { PlatformSelector } from './platform-settings/PlatformSelector';
import { PlatformSettingsShell } from './platform-settings/PlatformSettingsShell';
import {
  cleanPlatformsForSave,
  initPlatformSettingsState,
  platformSettingsReducer,
} from './platform-settings/platformSettingsState';

export function PlatformSettingsModal({ platforms, onSave, onClose }) {
  const [{ plats, selId }, dispatch] = useReducer(
    platformSettingsReducer,
    platforms,
    initPlatformSettingsState
  );

  const sel = plats.find(p => p.id === selId) ?? null;

  function handleSave() {
    onSave?.(cleanPlatformsForSave(plats));
  }

  return (
    <PlatformSettingsShell onClose={onClose} onSave={handleSave}>
      <PlatformSelector
        platforms={plats}
        selectedId={selId}
        onSelect={id => dispatch({ type: 'SET_SEL', id })}
        onAdd={() => dispatch({ type: 'ADD_PLATFORM' })}
      />
      <PlatformEditorPanel
        platform={sel}
        onNameChange={name => dispatch({ type: 'SET_PLAT_NAME', name })}
        onAddFee={() => dispatch({ type: 'ADD_FEE' })}
        onPatchFee={(id, patch) => dispatch({ type: 'PATCH_FEE', id, patch })}
        onSizeOverride={(id, key, val) =>
          dispatch({ type: 'PATCH_SIZE_OVERRIDE', id, key, val })
        }
        onDeleteFee={id => dispatch({ type: 'DELETE_FEE', id })}
        onDeletePlatform={id => dispatch({ type: 'DELETE_PLATFORM', id })}
      />
    </PlatformSettingsShell>
  );
}
