export function ManageRowTagsCell({ tags }) {
  return (
    <td>
      {tags.length > 0 ? (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <span
              key={tag}
              style={{
                padding: '1px 5px',
                fontSize: 10,
                fontWeight: 500,
                borderRadius: 3,
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : (
        <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
      )}
    </td>
  );
}
