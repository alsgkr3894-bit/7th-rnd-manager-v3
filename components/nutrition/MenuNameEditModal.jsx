'use client';
import { useMemo, useState } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { asDisplayText, asObjectArray, asRecord, noop } from '@/lib/ui/prop-guards';

/**
 * 출력용 메뉴명 편집 모달.
 * menus: [{ menuCode, menuName }]  — 원래 이름
 * overrides: { [menuCode]: string } — 현재 저장된 override
 * onApply(newOverrides) — 변경 후 전체 map 전달
 * 순서 변경: 드래그 앤 드롭 + ↑/↓ + 맨위/맨아래.
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
  const [dragCode, setDragCode] = useState(null);
  const [search, setSearch] = useState('');

  const orderedMenus = useMemo(
    () =>
      orderedCodes
        .map(code => menuByCode.get(code))
        .filter(Boolean)
        .concat(safeMenus.filter(menu => !orderedCodes.includes(menu.menuCode))),
    [menuByCode, orderedCodes, safeMenus]
  );
  const displayCodes = useMemo(() => orderedMenus.map(menu => menu.menuCode), [orderedMenus]);

  const query = search.trim().toLowerCase();
  const isFiltering = query.length > 0;
  const visibleMenus = useMemo(() => {
    if (!isFiltering) return orderedMenus;
    return orderedMenus.filter(menu => {
      const override = asDisplayText(vals[menu.menuCode]);
      return (
        menu.menuName.toLowerCase().includes(query) ||
        menu.menuCode.toLowerCase().includes(query) ||
        override.toLowerCase().includes(query)
      );
    });
  }, [isFiltering, orderedMenus, query, vals]);

  function reorder(fromCode, toCode) {
    if (!fromCode || !toCode || fromCode === toCode) return;
    setOrderedCodes(() => {
      const from = displayCodes.indexOf(fromCode);
      const to = displayCodes.indexOf(toCode);
      if (from < 0 || to < 0 || from === to) return displayCodes;
      const next = [...displayCodes];
      next.splice(from, 1);
      next.splice(to, 0, fromCode);
      return next;
    });
  }

  function moveMenu(menuCode, direction) {
    const from = displayCodes.indexOf(menuCode);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= displayCodes.length) return;
    const next = [...displayCodes];
    [next[from], next[to]] = [next[to], next[from]];
    setOrderedCodes(next);
  }

  function moveToEdge(menuCode, edge) {
    const from = displayCodes.indexOf(menuCode);
    if (from < 0) return;
    const next = displayCodes.filter(code => code !== menuCode);
    if (edge === 'top') next.unshift(menuCode);
    else next.push(menuCode);
    setOrderedCodes(next);
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
      applyOrder(displayCodes.filter(code => menuByCode.has(code)));
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
      width={allowOrder ? 'min(760px, 95vw)' : 'min(560px, 95vw)'}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="메뉴명·코드로 찾기"
          style={{
            flex: 1,
            minWidth: 160,
            fontSize: 13,
            padding: '6px 10px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--surface)',
            color: 'var(--text-1)',
          }}
        />
        {importOverrides && (
          <button type="button" className="btn sm" onClick={importFromSource}>
            {importActionLabel || '기존 출력명 가져오기'}
          </button>
        )}
      </div>

      {allowOrder && (
        <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 6 }}>
          {isFiltering
            ? '검색 중에는 순서 변경이 잠깁니다. 검색어를 지우면 드래그·이동이 다시 활성화됩니다.'
            : '⠿ 손잡이를 드래그해 순서를 바꾸거나, 오른쪽 버튼(맨위·↑·↓·맨아래)을 사용하세요.'}
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
        {visibleMenus.map(({ menuCode, menuName }) => {
          const orderIndex = displayCodes.indexOf(menuCode);
          const isDragging = dragCode === menuCode;
          return (
            <div
              key={menuCode}
              onDragOver={
                allowOrder && !isFiltering
                  ? e => {
                      e.preventDefault();
                      if (dragCode) reorder(dragCode, menuCode);
                    }
                  : undefined
              }
              onDrop={allowOrder && !isFiltering ? e => e.preventDefault() : undefined}
              style={{
                display: 'grid',
                gridTemplateColumns: allowOrder ? '150px 1fr 1fr' : '1fr 1fr',
                gap: 8,
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 8,
                background: isDragging ? 'var(--accent-soft)' : 'var(--surface-2)',
                border: `1px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                opacity: isDragging ? 0.6 : 1,
              }}
            >
              {allowOrder && (
                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <span
                    draggable={!isFiltering}
                    onDragStart={
                      isFiltering
                        ? undefined
                        : e => {
                            setDragCode(menuCode);
                            e.dataTransfer.effectAllowed = 'move';
                            try {
                              e.dataTransfer.setData('text/plain', menuCode);
                            } catch {
                              /* 일부 브라우저 no-op */
                            }
                          }
                    }
                    onDragEnd={() => setDragCode(null)}
                    aria-label={`${menuName} 드래그로 순서 변경`}
                    title={isFiltering ? '검색 중에는 순서 변경 불가' : '드래그해서 순서 변경'}
                    style={{
                      cursor: isFiltering ? 'not-allowed' : 'grab',
                      color: 'var(--text-4)',
                      fontSize: 14,
                      padding: '0 2px',
                      userSelect: 'none',
                    }}
                  >
                    ⠿
                  </span>
                  <span
                    style={{
                      width: 20,
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'var(--text-3)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {orderIndex + 1}
                  </span>
                  <button
                    type="button"
                    className="btn icon sm"
                    aria-label={`${menuName} 맨 위로`}
                    title="맨 위로"
                    onClick={() => moveToEdge(menuCode, 'top')}
                    disabled={isFiltering || orderIndex === 0}
                  >
                    ⤒
                  </button>
                  <button
                    type="button"
                    className="btn icon sm"
                    aria-label={`${menuName} 위로 이동`}
                    onClick={() => moveMenu(menuCode, -1)}
                    disabled={isFiltering || orderIndex === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn icon sm"
                    aria-label={`${menuName} 아래로 이동`}
                    onClick={() => moveMenu(menuCode, 1)}
                    disabled={isFiltering || orderIndex === displayCodes.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn icon sm"
                    aria-label={`${menuName} 맨 아래로`}
                    title="맨 아래로"
                    onClick={() => moveToEdge(menuCode, 'bottom')}
                    disabled={isFiltering || orderIndex === displayCodes.length - 1}
                  >
                    ⤓
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
                title={menuName}
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
          );
        })}
        {safeMenus.length === 0 && (
          <div
            style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}
          >
            편집할 메뉴가 없어요
          </div>
        )}
        {safeMenus.length > 0 && visibleMenus.length === 0 && (
          <div
            style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}
          >
            &apos;{search.trim()}&apos;에 맞는 메뉴가 없어요
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn sm" onClick={resetAll}>
          출력명 전체 초기화
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
