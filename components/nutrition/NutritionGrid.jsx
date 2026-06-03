import { NUTRITION_FIELDS } from '@/lib/nutrition/values/store';

export function NutritionGrid({ values, onChange, disabled }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px 12px' }}>
      {NUTRITION_FIELDS.map(f => (
        <div key={f.key}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>
            {f.label} <span style={{ color: 'var(--text-4)' }}>({f.unit})</span>
          </label>
          <input
            className="input" type="number" min="0" step="0.1"
            value={values?.[f.key] ?? ''}
            onChange={e => onChange?.(f.key, e.target.value)}
            disabled={disabled}
            style={{ fontSize: 13 }}
          />
        </div>
      ))}
    </div>
  );
}
