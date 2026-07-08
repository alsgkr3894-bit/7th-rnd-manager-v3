'use client';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';

export function AllergenSection({ allergens, allergenNone, onSet }) {
  const selected = Array.isArray(allergens) ? allergens : [];
  return (
    <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-2)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        알레르기 유발물질
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            color: allergenNone ? 'var(--positive)' : 'var(--text-3)',
          }}
        >
          <input
            type="checkbox"
            checked={allergenNone === true}
            onChange={e => {
              onSet('allergenNone', e.target.checked);
              if (e.target.checked) onSet('allergens', []);
            }}
            style={{ accentColor: 'var(--positive)', width: 13, height: 13 }}
          />
          알레르기 없음
        </label>
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
              disabled={allergenNone === true}
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
                color: active ? '#fff' : allergenNone ? 'var(--text-4)' : 'var(--text-3)',
                cursor: allergenNone ? 'not-allowed' : 'pointer',
                opacity: allergenNone ? 0.55 : 1,
                transition: 'all 120ms ease',
              }}
            >
              {a.allergenName}
            </button>
          );
        })}
      </div>
      {allergenNone && (
        <div style={{ fontSize: 12, color: 'var(--text-4)', paddingTop: 8 }}>
          알레르기 없음으로 표시됨
        </div>
      )}
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
