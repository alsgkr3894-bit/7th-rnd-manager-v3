import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { asDisplayText, asObjectArray, asRecord, asStringArray, noop } from '@/lib/ui/prop-guards';

export function SlotEditor({ slot = {}, allMenus, onChange = noop, onRemove = noop }) {
  const safeSlot = asRecord(slot);
  const safeAllMenus = useMemo(() => asObjectArray(allMenus), [allMenus]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    []
  );

  function closeSoon() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
      blurTimerRef.current = null;
    }, 150);
  }

  const selected = useMemo(() => asStringArray(safeSlot.menuCodes), [safeSlot.menuCodes]);

  const qtyNum = parseFloat(safeSlot.qty);
  const baseQtyNum = parseFloat(safeSlot.baseQty);
  const hasRatio = !isNaN(qtyNum) && qtyNum > 0 && !isNaN(baseQtyNum) && baseQtyNum > 0;
  const ratioHint = hasRatio
    ? `${baseQtyNum}개 중 ${qtyNum}개 → 영양값 ${Math.round((qtyNum / baseQtyNum) * 100)}%`
    : '전체 수량(100%) 반영';

  const matches = useMemo(() => {
    const lowerQuery = asDisplayText(query).trim().toLowerCase();
    if (!lowerQuery) return [];
    return safeAllMenus
      .filter(menu => {
        const menuCode = asDisplayText(menu.menuCode);
        const menuName = asDisplayText(menu.menuName);
        return (
          !selected.includes(menuCode) &&
          (menuName.toLowerCase().includes(lowerQuery) ||
            menuCode.toLowerCase().includes(lowerQuery))
        );
      })
      .slice(0, 8);
  }, [query, safeAllMenus, selected]);

  const selectedMenuObjects = safeAllMenus.filter(menu =>
    selected.includes(asDisplayText(menu.menuCode))
  );

  function addMenu(menuCode) {
    const code = asDisplayText(menuCode);
    if (!code) return;
    onChange({ menuCodes: [...selected, code] });
    setQuery('');
    setOpen(false);
  }

  function removeMenu(menuCode) {
    const code = asDisplayText(menuCode);
    onChange({ menuCodes: selected.filter(item => item !== code) });
  }

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
          <input
            type="number"
            min="0"
            className="input"
            style={{ width: 64, fontSize: 12 }}
            value={safeSlot.qty ?? ''}
            onChange={event => onChange({ qty: event.target.value })}
            placeholder="세트 수량"
          />
          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>/</span>
          <input
            type="number"
            min="0"
            className="input"
            style={{ width: 64, fontSize: 12 }}
            value={safeSlot.baseQty ?? ''}
            onChange={event => onChange({ baseQty: event.target.value })}
            placeholder="기준 수량"
          />
          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{ratioHint}</span>
        </div>
        <button
          type="button"
          className="btn sm ghost"
          style={{ color: 'var(--danger)', flexShrink: 0 }}
          onClick={onRemove}
        >
          <Icon.close style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {selectedMenuObjects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {selectedMenuObjects.map((menu, index) => {
            const menuCode = asDisplayText(menu.menuCode);
            const menuName = asDisplayText(menu.menuName, menuCode || `메뉴 ${index + 1}`);
            return (
              <span
                key={menuCode || index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {menuName}
                <button
                  type="button"
                  onClick={() => removeMenu(menuCode)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#fff',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Icon.close style={{ width: 10, height: 10 }} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input
          className="input"
          style={{ fontSize: 12 }}
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => asDisplayText(query).trim() && setOpen(true)}
          onBlur={closeSoon}
          placeholder="메뉴명 또는 코드로 검색…"
        />
        {open && matches.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
            }}
          >
            {matches.map((menu, index) => {
              const menuCode = asDisplayText(menu.menuCode);
              const menuName = asDisplayText(menu.menuName, menuCode || `메뉴 ${index + 1}`);
              return (
                <button
                  type="button"
                  key={menuCode || index}
                  onMouseDown={() => addMenu(menuCode)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    textAlign: 'left',
                    borderBottom: '1px solid var(--surface-2)',
                  }}
                >
                  <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{menuName}</span>
                  <span style={{ color: 'var(--text-4)', fontSize: 11 }}>{menuCode}</span>
                </button>
              );
            })}
          </div>
        )}
        {open && asDisplayText(query).trim() && matches.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            &quot;{query}&quot; 검색 결과 없음
          </div>
        )}
      </div>
    </div>
  );
}
