import { PhotoCarousel } from '@/components/note/PhotoCarousel';

export function SampleCardMedia({ photos = [], photosCount, category, altText }) {
  return (
    <div
      style={{
        height: 230,
        background: 'var(--surface-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PhotoCarousel
        photos={photos}
        title={altText}
        height={230}
        placeholderSize={40}
        showCount={photosCount > 1}
        rounded={0}
      />

      {category ? (
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
      ) : null}
    </div>
  );
}
