'use client';

export function IngredientRadioOption({ name, value, checked, onChange, muted, children }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        fontSize: 14,
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        style={{ accentColor: 'var(--accent)' }}
      />
      {muted ? <span style={{ color: 'var(--text-3)' }}>{children}</span> : children}
    </label>
  );
}
