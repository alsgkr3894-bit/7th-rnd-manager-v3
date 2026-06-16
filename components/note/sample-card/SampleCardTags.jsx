export function SampleCardTags({ tags }) {
  if (!tags.length) return null;

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
      {tags.slice(0, 4).map(tag => (
        <span
          key={tag}
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-3)',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 8,
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
