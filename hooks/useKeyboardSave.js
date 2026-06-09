import { useEffect } from 'react';

export function isSaveShortcut(event) {
  if (!event || typeof event !== 'object') return false;
  if (!event.ctrlKey && !event.metaKey) return false;
  return String(event.key || '').toLowerCase() === 's';
}

/** @param {Function} onSave - Ctrl+S / Cmd+S 시 호출 */
export function useKeyboardSave(onSave) {
  useEffect(() => {
    if (typeof onSave !== 'function') return;
    const handler = e => {
      if (isSaveShortcut(e)) {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave]);
}
