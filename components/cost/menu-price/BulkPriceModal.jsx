'use client';
import { useState } from 'react';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  getAllMenuPrices, addMenuPrice, updateMenuPrice,
  DEFAULT_PRICE_MAP,
} from '@/lib/cost/menu-price';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import { getAllMenuMaster } from '@/lib/menu-master';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';

const CODE_GROUPS = [
  { sub: 'PS',  label: '프리미엄 스페셜', sizes: ['L', 'R'] },
  { sub: 'PR',  label: '프리미엄',        sizes: ['L', 'R'] },
  { sub: 'OR',  label: '오리지널',        sizes: ['L', 'R'] },
  { sub: 'HH',  label: '하프앤하프',      sizes: ['L', 'R'] },
  { sub: 'ONE', label: '1인피자',         sizes: ['단품'] },
];

const noop = () => {};

export function BulkPriceModal({ onClose, onDone }) {
  const close = typeof onClose === 'function' ? onClose : noop;
  const done = typeof onDone === 'function' ? onDone : noop;
  const [prices, setPrices] = useState(() => {
    const init = {};
    CODE_GROUPS.forEach(g => {
      init[g.sub] = {};
      g.sizes.forEach(s => { init[g.sub][s] = String(DEFAULT_PRICE_MAP[g.sub]?.[s] ?? ''); });
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useKeyboardSave(() => { if (!saving) handleApply(); });

  const setPrice = (sub, size, val) =>
    setPrices(p => ({ ...p, [sub]: { ...p[sub], [size]: val } }));

  function validatePrices() {
    for (const group of CODE_GROUPS) {
      for (const size of group.sizes) {
        const parsed = parseOptionalNonNegativeNumber(prices[group.sub]?.[size]);
        if (!parsed.ok) {
          return `${group.label} ${size} 가격은 0 이상의 숫자만 입력하세요`;
        }
      }
    }
    return '';
  }

  const handleApply = async () => {
    const nextError = validatePrices();
    if (nextError) {
      setError(nextError);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await initDB();
      const [masters, existing] = await Promise.all([getAllMenuMaster(), getAllMenuPrices()]);
      const safeMasters = Array.isArray(masters) ? masters : [];
      const safeExisting = Array.isArray(existing) ? existing : [];
      const existingMap = new Map(safeExisting.map(r => [r.menuCode, r]));
      let created = 0, updated = 0;

      for (const m of safeMasters) {
        if (!m.menuCode || m.status === 'discontinued') continue;
        const parts = m.menuCode.toUpperCase().split('-');
        const sub  = parts[1];
        const lastPart = parts[parts.length - 1];
        const size = lastPart === 'ONE' ? '단품' : lastPart;
        const group = CODE_GROUPS.find(g => g.sub === sub);
        if (!group) continue;
        const priceVal = parseOptionalNonNegativeNumber(prices[sub]?.[size]).value;
        if (!priceVal) continue;

        const { category } = parseCategoryFromCode(m.menuCode);
        const ex = existingMap.get(m.menuCode);
        if (ex) {
          await updateMenuPrice(ex.id, { ...ex, price: priceVal });
          updated++;
        } else {
          await addMenuPrice({ menuCode: m.menuCode, menuName: m.menuName, category, size: m.size || size, price: priceVal });
          created++;
        }
      }
      showToast(`${created}개 생성 · ${updated}개 업데이트`, 'ok');
      done();
      close();
    } catch (err) {
      showToast('실패: ' + (err?.message || err), 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalFrame
      title="코드별 일괄 가격 설정"
      subtitle="메뉴 마스터의 코드를 기준으로 일치하는 모든 메뉴에 가격을 일괄 적용합니다"
      onClose={close}
      width="min(580px,95vw)"
      zIndex={300}
      padding="28px 32px"
      maxHeight="90vh"
    >

        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8, padding: '6px 4px', borderBottom: '2px solid var(--divider)', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>코드 / 중분류</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>L 사이즈</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>R / 1인피자</div>
        </div>

        {CODE_GROUPS.map(g => (
          <div key={g.sub} style={{
            display: 'grid', gridTemplateColumns: '140px 1fr 1fr',
            gap: 8, alignItems: 'center',
            padding: '12px 4px', borderBottom: '1px solid var(--divider)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 12, fontWeight: 800,
                color: 'var(--accent-text)', background: 'var(--accent-soft)',
                padding: '3px 8px', borderRadius: 6, flexShrink: 0,
              }}>
                P-{g.sub}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                {g.label}
              </span>
            </div>

            {g.sizes.includes('L') ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <input type="number" className="input"
                  min="0"
                  style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, width: 110 }}
                  value={prices[g.sub]?.L ?? ''}
                  onChange={e => setPrice(g.sub, 'L', e.target.value)}
                  placeholder="0" />
                <span style={{ fontSize: 12, color: 'var(--text-4)', flexShrink: 0 }}>원</span>
              </div>
            ) : (
              <div style={{ textAlign: 'right', color: 'var(--text-4)', fontSize: 13 }}>—</div>
            )}

            {(g.sizes.includes('R') || g.sizes.includes('단품')) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <input type="number" className="input"
                  min="0"
                  style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, width: 110 }}
                  value={prices[g.sub]?.[g.sizes.includes('R') ? 'R' : '단품'] ?? ''}
                  onChange={e => setPrice(g.sub, g.sizes.includes('R') ? 'R' : '단품', e.target.value)}
                  placeholder="0" />
                <span style={{ fontSize: 12, color: 'var(--text-4)', flexShrink: 0 }}>원</span>
              </div>
            ) : (
              <div style={{ textAlign: 'right', color: 'var(--text-4)', fontSize: 13 }}>—</div>
            )}
          </div>
        ))}

        {error && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--negative)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={close}>취소</button>
          <button className="btn primary" onClick={handleApply} disabled={saving}>
            {saving ? '적용 중…' : '일괄 적용'}
          </button>
        </div>
    </ModalFrame>
  );
}
