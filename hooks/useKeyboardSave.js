import { useEffect } from 'react';

/** @param {Function} onSave - Ctrl+S / Cmd+S 시 호출 */
export function useKeyboardSave(onSave) {
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave]);
}
