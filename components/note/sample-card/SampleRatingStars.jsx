export function SampleRatingStars({ sampleId, rating = 0, onRatingChange }) {
  return (
    <div className="inline-stars" onClick={event => event.stopPropagation()}>
      {[1, 2, 3, 4, 5].map(value => (
        <button
          key={value}
          className={'inline-star' + (value <= rating ? ' lit' : '')}
          onClick={event => onRatingChange(sampleId, rating === value ? 0 : value, event)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
