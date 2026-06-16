'use client';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';

export function AllergenSection({ allergens, onSet }) {
  const selected = Array.isArray(allergens) ? allergens : [];
  return (
    <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
        알레르기 유발물질
        {selected.length > 0 && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              padding: '1px 7px',
              borderRadius: 999,
            }}
          >
            {selected.length}개 선택
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ALLERGEN_SEED.map(a => {
          const active = selected.includes(a.allergenCode);
          return (
            <button
              key={a.allergenCode}
              type="button"
              onClick={() =>
                onSet(
                  'allergens',
                  active
                    ? selected.filter(c => c !== a.allergenCode)
                    : [...selected, a.allergenCode]
                )
              }
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: active ? 'none' : '1px solid var(--border)',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-3)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {a.allergenName}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          type="button"
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--text-4)',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
          }}
          onClick={() => onSet('allergens', [])}
        >
          선택 초기화
        </button>
      )}
    </div>
  );
}
