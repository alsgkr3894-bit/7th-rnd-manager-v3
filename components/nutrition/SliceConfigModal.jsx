'use client';
import { useState } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { defaultSlices } from '@/lib/nutrition/slice-config';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const EMPTY_OBJECT = {};
const noop = () => {};

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : EMPTY_OBJECT;
}

/**
 * 피자 조각수 설정 모달.
 * pizzaMenus: [{ menuCode, menuName, category }] — 피자 그룹 메뉴
 * masterByCode: menuCode → master (기본 조각수 판별)
 * counts: { [menuCode]: { L, R } } — 현재 저장된 오버라이드
 * onApply(nextCounts) — 변경 후 전체 map 전달
 *
 * 빈칸이면 기본값(일반피자 8·1인피자 4)으로 복원.
 */
export function SliceConfigModal({ pizzaMenus, masterByCode, counts, onApply, onClose }) {
  const safePizzaMenus = asObjectArray(pizzaMenus)
    .map((menu, index) => ({
      ...menu,
      menuCode: asDisplayText(menu.menuCode),
      menuName: asDisplayText(menu.menuName, `피자 메뉴 ${index + 1}`),
    }))
    .filter(menu => menu.menuCode);
  const safeCounts = asRecord(counts);
  const safeMasterByCode = asRecord(masterByCode);
  const close = typeof onClose === 'function' ? onClose : noop;
  const applyCounts = typeof onApply === 'function' ? onApply : null;
  const [vals, setVals] = useState(() => {
    const m = {};
    for (const menu of safePizzaMenus) {
      const ov = asRecord(safeCounts[menu.menuCode]);
      m[menu.menuCode] = { L: ov.L != null ? String(ov.L) : '', R: ov.R != null ? String(ov.R) : '' };
    }
    return m;
  });

  const setVal = (code, side, v) =>
    setVals(prev => ({ ...prev, [code]: { ...prev[code], [side]: v.replace(/[^\d]/g, '') } }));

  function apply() {
    const next = { ...safeCounts };
    for (const menu of safePizzaMenus) {
      const v = vals[menu.menuCode] || {};
      const L = Number(v.L), R = Number(v.R);
      const entry = {};
      if (v.L !== '' && L > 0) entry.L = L;
      if (v.R !== '' && R > 0) entry.R = R;
      if (Object.keys(entry).length) next[menu.menuCode] = entry;
      else delete next[menu.menuCode];
    }
    applyCounts?.(next);
    close();
  }

  function resetAll() {
    setVals(prev => {
      const cleared = {};
      for (const k of Object.keys(prev)) cleared[k] = { L: '', R: '' };
      return cleared;
    });
  }

  const inputStyle = {
    fontSize: 13, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6,
    background: 'var(--surface)', color: 'var(--text-1)', width: '100%', boxSizing: 'border-box', textAlign: 'center',
  };

  return (
    <ModalFrame
      title="피자 조각수 설정"
      subtitle="한판 = 몇 조각인지 설정합니다. 비우면 기본값(일반피자 8 · 1인피자 4)을 사용합니다."
      onClose={close}
      width="min(560px, 95vw)"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 6, alignItems: 'center', marginBottom: 6, padding: '0 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-4)' }}>
        <span>메뉴</span><span style={{ textAlign: 'center' }}>L 조각</span><span style={{ textAlign: 'center' }}>R 조각</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '60vh', overflowY: 'auto' }}>
        {safePizzaMenus.map(menu => {
          const def = defaultSlices(menu, safeMasterByCode);
          return (
            <div key={menu.menuCode}
              style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 6, alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {menu.menuName}
              </span>
              <input type="text" inputMode="numeric" value={vals[menu.menuCode]?.L ?? ''} placeholder={String(def.L)}
                onChange={e => setVal(menu.menuCode, 'L', e.target.value)} style={inputStyle} />
              <input type="text" inputMode="numeric" value={vals[menu.menuCode]?.R ?? ''} placeholder={String(def.R)}
                onChange={e => setVal(menu.menuCode, 'R', e.target.value)} style={inputStyle} />
            </div>
          );
        })}
        {safePizzaMenus.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>피자 메뉴가 없어요</div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn sm" onClick={resetAll}>전체 초기화</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={close}>취소</button>
          <button type="button" className="btn primary" onClick={apply}>적용</button>
        </div>
      </div>
    </ModalFrame>
  );
}
