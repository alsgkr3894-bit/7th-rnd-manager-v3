'use client';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { CRUST_TYPES } from '@/lib/nutrition/values/store';
import { groupMenusOrdered, normalizeNutritionCategory } from '@/lib/nutrition/menu-group';
import { asRecord, noop } from '@/lib/nutrition/values/base-helpers';

const GROUP_HEADER_STYLE = {
  padding: '5px 14px 4px',
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--text-4)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: 'var(--surface-2)',
  borderBottom: '1px solid var(--divider)',
  userSelect: 'none',
};

export function MenuGroupList({ menus, rawMap, menuMasters, selMenu, onSelect }) {
  const safeMenus = asObjectArray(menus);
  const safeRawMap = asRecord(rawMap);
  const masterByCode = Object.fromEntries(asObjectArray(menuMasters).map(m => [m.menuCode, m]));
  const groups = groupMenusOrdered(safeMenus, masterByCode);
  const multiGroup = groups.length > 1;
  const selectMenu = typeof onSelect === 'function' ? onSelect : noop;

  return (
    <>
      {groups.map(({ group, items }) => (
        <div key={group}>
          {multiGroup && <div style={GROUP_HEADER_STYLE}>{group}</div>}
          {items.map((m, index) => {
            const menuCode = asDisplayText(m.menuCode);
            const menuName = asDisplayText(m.menuName, menuCode || `메뉴 ${index + 1}`);
            const category = normalizeNutritionCategory(asDisplayText(m.category), '피자');
            const selected = selMenu?.id === m.id || (menuCode && selMenu?.menuCode === menuCode);
            return (
              <div
                key={m.id || menuCode || `${group}-${index}`}
                onClick={() => selectMenu(m)}
                style={{
                  padding: '9px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: selected ? 'var(--accent-soft)' : 'transparent',
                  borderLeft: selected ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: selected ? 700 : 400,
                      color: selected ? 'var(--accent-text)' : 'var(--text-1)',
                    }}
                  >
                    {menuName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                    {category}
                    {menuCode && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontFamily: 'monospace',
                          color: 'var(--accent-text)',
                          opacity: 0.7,
                        }}
                      >
                        {menuCode}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {CRUST_TYPES.map(ct => {
                    const done = !!safeRawMap[`${menuCode}__${ct}`]?.kcal;
                    return (
                      <span
                        key={ct}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: done ? 'var(--accent)' : 'var(--border)',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
