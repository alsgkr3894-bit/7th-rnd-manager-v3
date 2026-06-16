import { SampleRatingStars } from './SampleRatingStars';

export function SampleCardHeader({ title, sampleId, rating, onRatingChange }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {title}
      </div>

      <SampleRatingStars sampleId={sampleId} rating={rating} onRatingChange={onRatingChange} />
    </div>
  );
}
