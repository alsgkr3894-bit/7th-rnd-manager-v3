export function SampleCardSelectionOverlay({
  batchMode,
  isBatchSelected,
  compareMode,
  isCompareSelected,
  compareIdx,
}) {
  if (batchMode) return <BatchSelectionBadge selected={isBatchSelected} />;
  if (compareMode && isCompareSelected) return <CompareSelectionBadge index={compareIdx + 1} />;
  return null;
}

function BatchSelectionBadge({ selected }) {
  return (
    <div
      className={'batch-checkbox-wrap' + (selected ? ' checked' : '')}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        width: 20,
        height: 20,
        borderRadius: 4,
        background: '#fff',
        border: '2px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {selected && <span style={{ color: '#22c55e', fontSize: 14, lineHeight: 1 }}>✓</span>}
    </div>
  );
}

function CompareSelectionBadge({ index }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'var(--accent)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 800,
        pointerEvents: 'none',
      }}
    >
      {index}
    </div>
  );
}
