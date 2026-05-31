export function Stars({ value, size = 14 }) {
  return (
    <span style={{ color:'var(--star)', fontSize:size, letterSpacing:1 }}>
      {'★'.repeat(value)}
      <span style={{ color:'var(--border)' }}>{'★'.repeat(5 - value)}</span>
    </span>
  );
}
