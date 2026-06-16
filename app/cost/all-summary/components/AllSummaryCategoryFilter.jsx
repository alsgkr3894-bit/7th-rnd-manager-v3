export function AllSummaryCategoryFilter({ categories, activeCategory, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0 8px' }}>
      {categories.map(category => (
        <button
          key={category}
          className={'chip' + (activeCategory === category ? ' active' : '')}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
