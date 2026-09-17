'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePaletteItems, isPaletteItemVisibleForRole } from '@/hooks/usePaletteItems';
import {
  getFavoritePaletteItems,
  getRecentPaletteItems,
  saveRecentPaletteItem,
  toggleFavoritePaletteItem,
} from '@/lib/palette-recent';
import { useDebounce } from '@/hooks/useDebounce';
import { asDisplayText } from '@/lib/ui/prop-guards';
import {
  buildFavoriteHrefSet,
  buildPaletteNavItems,
  filterPaletteItems,
  groupPaletteItems,
  isSearchingQuery,
  mapWorkLogs,
  sanitizePaletteItems,
} from './paletteUtils';

function getRecent() {
  return getRecentPaletteItems();
}
function saveRecent(item) {
  saveRecentPaletteItem(item);
}

/** ⌘K 팔레트의 상태·효과·키보드 처리·파생 목록을 한곳에 모은 훅 */
export function useCommandPaletteState({ open, onClose, canEdit = false }) {
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const inputRef = useRef(null);
  const focusTimerRef = useRef(null);
  const router = useRouter();
  const allItems = usePaletteItems(open, { canEdit });
  const debouncedQ = useDebounce(q, 150);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActiveIdx(0);
    setRecent(getRecent());
    setFavorites(getFavoritePaletteItems());
    setWorkItems([]);
    import('@/lib/work-log')
      .then(({ getAllWorkLogs, WORK_LOG_TYPES }) =>
        getAllWorkLogs().then(logs => {
          setWorkItems(mapWorkLogs(logs, WORK_LOG_TYPES));
        })
      )
      .catch(() => {
        setWorkItems([]);
      });
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      inputRef.current?.focus();
      focusTimerRef.current = null;
    }, 30);
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') e.preventDefault();
      if (e.key === 'Escape' && open) onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const isVisible = item => isPaletteItemVisibleForRole(item, canEdit);
  const safeAllItems = sanitizePaletteItems(allItems);
  const safeRecent = sanitizePaletteItems(recent, isVisible);
  const safeFavorites = sanitizePaletteItems(favorites, isVisible);
  const safeWorkItems = sanitizePaletteItems(workItems, isVisible);
  const isSearching = isSearchingQuery(debouncedQ);
  const filtered = filterPaletteItems(
    [...safeAllItems, ...safeWorkItems],
    safeAllItems,
    debouncedQ
  );
  const navItems = buildPaletteNavItems({
    isSearching,
    favorites: safeFavorites,
    workItems: safeWorkItems,
    recent: safeRecent,
    grouped: groupPaletteItems(filtered),
  });
  const favoriteHrefSet = buildFavoriteHrefSet(safeFavorites);

  const pick = item => {
    const href = asDisplayText(item?.href);
    const label = asDisplayText(item?.label, href);
    if (!href) return;
    saveRecent({ ...item, href, label, kind: asDisplayText(item?.kind, 'nav') });
    onClose?.();
    router.push(href);
  };

  const toggleFavorite = (event, item) => {
    event.stopPropagation();
    const updated = toggleFavoritePaletteItem(item);
    setFavorites(updated);
  };

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') onClose();
    else if (e.key === 'Enter' && navItems[activeIdx]) pick(navItems[activeIdx]);
  }

  const handleQueryChange = e => {
    setQ(e.target.value);
    setActiveIdx(0);
  };

  return {
    q,
    inputRef,
    activeIdx,
    setActiveIdx,
    isSearching,
    filtered,
    safeFavorites,
    safeWorkItems,
    safeRecent,
    favoriteHrefSet,
    pick,
    toggleFavorite,
    handleKey,
    handleQueryChange,
  };
}
