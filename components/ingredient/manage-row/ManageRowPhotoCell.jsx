export function ManageRowPhotoCell({ photo, photoCount, name }) {
  return (
    <td style={{ width: 58 }}>
      {photo ? (
        <div style={{ position: 'relative', width: 44, height: 34 }}>
          <img
            src={photo.data}
            alt={photo.name || name}
            style={{
              width: 44,
              height: 34,
              objectFit: 'cover',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              display: 'block',
            }}
          />
          {photoCount > 1 && (
            <span
              style={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                borderRadius: 999,
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 900,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid var(--surface)',
              }}
            >
              {photoCount}
            </span>
          )}
        </div>
      ) : (
        <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
      )}
    </td>
  );
}
