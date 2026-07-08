'use client';
import { useMemo, useState } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { asDisplayText, asObjectArray, asRecord, noop } from '@/lib/ui/prop-guards';

/**
 * 출력용 메뉴명 편집 모달.
 * menus: [{ menuCode, menuName }]  — 원래 이름
 * overrides: { [menuCode]: string } — 현재 저장된 override
 * onApply(newOverrides) — 변경 후 전체 map 전달
 */
export function MenuNameEditModal({
  menus,
  overrides,
  onApply,
  onClose,
  title = '출력용 메뉴명 편집',
  subtitle = '출력·표시에만 반영됩니다. 비우면 원래 이름으로 복원됩니다.',
  order = [],
  onApplyOrder,
  allowOrder = false,
  importActionLabel = '',
  onImportOverrides,
}) {
  const safeMenus = asObjectArray(menus)
    .map((menu, index) => ({
      ...menu,
      menuCode: asDisplayText(menu.menuCode),
      menuName: asDisplayText(menu.menuName, `메뉴 ${index + 1}`),
    }))
    .filter(menu => menu.menuCode);
  const menuByCode = useMemo(
    () => new Map(safeMenus.map(menu => [menu.menuCode, menu])),
    [safeMenus]
  );
  const initialOrder = useMemo(() => {
    const seen = new Set();
    const ordered = [];
    (Array.isArray(order) ? order : []).forEach(code => {
      const key = asDisplayText(code);
      if (key && menuByCode.has(key) && !seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    });
    safeMenus.forEach(menu => {
      if (!seen.has(menu.menuCode)) ordered.push(menu.menuCode);
    });
    return ordered;
  }, [menuByCode, order, safeMenus]);
  const safeOverrides = asRecord(overrides);
  const close = typeof onClose === 'function' ? onClose : noop;
  const applyOverrides = typeof onApply === 'function' ? onApply : null;
  const applyOrder = typeof onApplyOrder === 'function' ? onApplyOrder : null;
  const importOverrides = typeof onImportOverrides === 'function' ? onImportOverrides : null;
  const [vals, setVals] = useState(() => {
    const m = {};
    for (const { menuCode } of safeMenus) {
      m[menuCode] = safeOverrides[menuCode] ?? '';
    }
    return m;
  });
  const [orderedCodes, setOrderedCodes] = useState(() => initialOrder);

  const orderedMenus = useMemo(
    () =>
      orderedCodes
        .map(code => menuByCode.get(code))
        .filter(Boolean)
        .concat(safeMenus.filter(menu => !orderedCodes.includes(menu.menuCode))),
    [menuByCode, orderedCodes, safeMenus]
  );

  function moveMenu(menuCode, direction) {
    setOrderedCodes(prev => {
      const current = prev.filter(code => menuByCode.has(code));
      const index = current.indexOf(menuCode);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return prev;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function apply() {
    const next = { ...safeOverrides };
    for (const { menuCode } of safeMenus) {
      const v = asDisplayText(vals[menuCode]).trim();
      if (v) next[menuCode] = v;
      else delete next[menuCode];
    }
    applyOverrides?.(next);
    if (allowOrder && applyOrder) {
      applyOrder(orderedCodes.filter(code => menuByCode.has(code)));
    }
    close();
  }

  function importFromSource() {
    const imported = asRecord(importOverrides?.());
    setVals(prev => {
      const next = { ...prev };
      for (const { menuCode } of safeMenus) {
        next[menuCode] = asDisplayText(imported[menuCode]);
      }
      return next;
    });
  }

  function resetAll() {
    setVals(prev => {
      const cleared = {};
      for (const k of Object.keys(prev)) cleared[k] = '';
      return cleared;
    });
  }

  return (
    <ModalFrame
      title={title}
      subtitle={subtitle}
      onClose={close}
      width={allowOrder ? 'min(720px, 95vw)' : 'min(560px, 95vw)'}
    >
      {importOverrides && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button type="button" className="btn sm" onClick={importFromSource}>
            {importActionLabel || '기존 출력명 가져오기'}
          </button>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        {orderedMenus.map(({ menuCode, menuName }, index) => (
          <div
            key={menuCode}
            style={{
              display: 'grid',
              gridTemplateColumns: allowOrder ? '70px 1fr 1fr' : '1fr 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            {allowOrder && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className="btn icon sm"
                  aria-label={`${menuName} 위로 이동`}
                  onClick={() => moveMenu(menuCode, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn icon sm"
                  aria-label={`${menuName} 아래로 이동`}
                  onClick={() => moveMenu(menuCode, 1)}
                  disabled={index === orderedMenus.length - 1}
                >
                  ↓
                </button>
              </div>
            )}
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {menuName}
            </span>
            <input
              type="text"
              value={vals[menuCode] ?? ''}
              onChange={e => setVals(prev => ({ ...prev, [menuCode]: e.target.value }))}
              placeholder={menuName}
              style={{
                fontSize: 13,
                padding: '5px 8px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surface)',
                color: 'var(--text-1)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
        {safeMenus.length === 0 && (
          <div
            style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}
          >
            편집할 메뉴가 없어요
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn sm" onClick={resetAll}>
          전체 초기화
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={close}>
            취소
          </button>
          <button type="button" className="btn primary" onClick={apply}>
            적용
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
