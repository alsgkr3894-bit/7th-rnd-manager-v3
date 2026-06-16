export function SampleCardMedia({ thumb, photosCount, category, altText }) {
  return (
    <div
      style={{
        height: 180,
        background: 'var(--surface-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={altText}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ fontSize: 40, opacity: 0.3 }}>📷</div>
      )}

      {photosCount > 1 && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            fontSize: 10,
            padding: '2px 7px',
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          📷 {photosCount}
        </span>
      )}

      <span
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 6,
          fontWeight: 700,
        }}
      >
        {category}
      </span>
    </div>
  );
}
