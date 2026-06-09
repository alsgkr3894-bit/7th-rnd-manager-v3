'use client';
import { useState, useMemo, useEffect } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { SearchBox } from '@/components/ui/SearchBox';
import { Icon } from '@/components/icons';

export function BulkIngredientModal({ open, onClose, ingredients, onAdd }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelected(new Set());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const active = ingredients.filter(i => !i.discontinued && !i.excluded);
    if (!search.trim()) return active.slice(0, 50);
    const q = search.toLowerCase();
    return active
      .filter(
        i =>
          i.ingredientName?.toLowerCase().includes(q) ||
          i.productCode?.toLowerCase().includes(q) ||
          i.manufacturer?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [ingredients, search]);

  const toggle = id =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAdd = () => {
    const items = ingredients.filter(i => selected.has(i.id));
    onAdd(items);
    onClose();
  };

  if (!open) return null;
  return (
    <ModalFrame onClose={onClose} width="min(560px, 95vw)" padding="0">
      <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>재료 일괄 추가</div>
        <SearchBox value={search} onChange={setSearch} placeholder="재료명·제품코드 검색" />
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>
        {filtered.map((ing, i) => (
          <label
            key={ing.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 24px',
              cursor: 'pointer',
              background: selected.has(ing.id) ? 'var(--accent-soft)' : 'transparent',
              animation: 'row-in 200ms ease both',
              animationDelay: `${i * 30}ms`,
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(ing.id)}
              onChange={() => toggle(ing.id)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ing.ingredientName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {ing.productCode} {ing.baseUnitType && `· ${ing.baseUnitType}`}
              </div>
            </div>
          </label>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 13 }}>
            검색 결과 없음
          </div>
        )}
      </div>
      <div
        style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{selected.size}개 선택됨</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" onClick={handleAdd} disabled={selected.size === 0}>
            {selected.size}개 추가
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
