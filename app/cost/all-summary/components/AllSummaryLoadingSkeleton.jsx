export function AllSummaryLoadingSkeleton() {
  return (
    <div className="card" style={{ padding: 16 }}>
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          style={{
            height: 40,
            marginBottom: 8,
            borderRadius: 8,
            background: 'var(--surface-2)',
            opacity: 1 - index * 0.1,
          }}
        />
      ))}
    </div>
  );
}
