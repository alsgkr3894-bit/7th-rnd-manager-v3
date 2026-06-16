export function ManageRowCodeCell({ productCode, isManual, jetteLinked }) {
  return (
    <td className="num" style={{ color: 'var(--text-3)', fontSize: 11 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
        <span>{productCode || (isManual ? '자체' : '-')}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 3,
            background: jetteLinked ? 'var(--positive-soft)' : 'var(--surface-3)',
            color: jetteLinked ? 'var(--positive)' : 'var(--text-3)',
          }}
        >
          {jetteLinked ? '연동' : '수동'}
        </span>
      </div>
    </td>
  );
}
