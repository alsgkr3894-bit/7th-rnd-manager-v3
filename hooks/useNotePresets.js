import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { KEYS } from '@/lib/note/keys';
import { useLocalStorage } from '@/hooks/useLocalStorage';

function normalizeNotePresets(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(p => p && typeof p === 'object' && !Array.isArray(p))
    .map(p => ({
      name: typeof p.name === 'string' ? p.name.trim() : '',
      status: typeof p.status === 'string' ? p.status : 'all',
      search: typeof p.search === 'string' ? p.search : '',
      sort: typeof p.sort === 'string' ? p.sort : 'createdAt',
    }))
    .filter(p => p.name);
}

export function useNotePresets({ statusFilter, search, sortBy, setStatusFilter, setSearch, setSortBy }) {
  const [presets, setPresets] = useLocalStorage(KEYS.NOTE_PRESETS, [], normalizeNotePresets);
  const [confirmDeletePreset, setConfirmDeletePreset] = useState(null);

  function savePreset(name) {
    const next = [...presets, { name, status: statusFilter, search, sort: sortBy }];
    setPresets(next);
    showToast(`"${name}" 프리셋 저장됨`, 'ok');
  }

  function applyPreset(p) {
    setStatusFilter(p.status);
    setSearch(p.search || '');
    setSortBy(p.sort);
  }

  function deletePreset(idx) {
    const next = presets.filter((_, i) => i !== idx);
    setPresets(next);
  }

  return { presets, confirmDeletePreset, setConfirmDeletePreset, savePreset, applyPreset, deletePreset };
}
