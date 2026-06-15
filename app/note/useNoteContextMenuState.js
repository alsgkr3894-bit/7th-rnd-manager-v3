'use client';

import { useEffect, useState } from 'react';

export function useNoteContextMenuState() {
  const [ctxMenu, setCtxMenu] = useState(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = e => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ctxMenu]);

  const openContextMenu = (note, e) => {
    e.preventDefault();
    const x = Math.min(e.clientX || 0, window.innerWidth - 180);
    const y = Math.min(e.clientY || 0, window.innerHeight - 220);
    setCtxMenu({ x, y, note });
  };

  return {
    ctxMenu,
    openContextMenu,
    closeContextMenu: () => setCtxMenu(null),
  };
}
