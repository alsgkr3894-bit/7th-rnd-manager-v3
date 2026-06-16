'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  buildMenuCodeDisplayList,
  filterMenuCodeOptions,
  getMenuCodeMeta,
  getNextMenuCodeActiveIndex,
} from './menu-code-picker/menuCodePickerUtils';
import { MenuCodeDropdown } from './menu-code-picker/MenuCodeDropdown';
import { MenuCodeSearchField } from './menu-code-picker/MenuCodeSearchField';
import { SelectedMenuCodePill } from './menu-code-picker/SelectedMenuCodePill';
import { useOutsideClick } from '@/hooks/useOutsideClick';

export { getBaseCode } from './menu-code-picker/menuCodePickerUtils';

export default function MenuCodePicker({
  menuMasters = [],
  value = '',
  onChange,
  dedup = true,
  mode = null,
  placeholder = '코드·메뉴명·중분류로 검색…',
  style,
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);

  const displayList = useMemo(() => {
    return buildMenuCodeDisplayList(menuMasters, { dedup, mode });
  }, [menuMasters, dedup, mode]);

  const selected = value ? displayList.find(m => m.code === value) : null;

  const results = useMemo(() => {
    return filterMenuCodeOptions(displayList, q);
  }, [q, displayList]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [results]);

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    listRef.current.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  useOutsideClick({ refs: ref, enabled: open, onOutside: () => setOpen(false) });

  const handleSelect = m => {
    if (!m?.code) return;
    const meta = getMenuCodeMeta(m.code);
    onChange?.(m.code, meta);
    setQ('');
    setOpen(false);
    setActiveIdx(-1);
  };
  const handleClear = () => {
    onChange?.('', {});
    setQ('');
    setActiveIdx(-1);
  };

  const handleKeyDown = e => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => getNextMenuCodeActiveIndex(i, e.key, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => getNextMenuCodeActiveIndex(i, e.key, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {selected ? (
        <SelectedMenuCodePill selected={selected} onClear={handleClear} />
      ) : (
        <MenuCodeSearchField
          query={q}
          displayListLength={displayList.length}
          placeholder={placeholder}
          onOpen={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onQueryChange={nextQuery => {
            setQ(nextQuery);
            setOpen(true);
            setActiveIdx(-1);
          }}
        />
      )}

      {open && !selected && results.length > 0 && (
        <MenuCodeDropdown
          results={results}
          activeIdx={activeIdx}
          listRef={listRef}
          onSelect={handleSelect}
          onHover={setActiveIdx}
        />
      )}
    </div>
  );
}
