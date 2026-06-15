'use client';

export function SampleCategoryFilter({ categories, catCounts, catFilter, onCatFilterChange }) {
  const categoryItems = [
    { key: 'all', label: '전체' },
    ...(Array.isArray(categories)
      ? categories.map(category => ({ key: category, label: category }))
      : []),
  ];

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, marginBottom: 8 }}>
      {categoryItems.map(({ key, label }) => (
        <button
          key={key}
          className={'chip' + (catFilter === key ? ' active' : '')}
          onClick={() => onCatFilterChange(key)}
        >
          {label}
          {catCounts?.[key] > 0 && (
            <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>{catCounts[key] || 0}</span>
          )}
        </button>
      ))}
    </div>
  );
}
