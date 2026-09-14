export function ManageRowCodeCell({ productCode, isManual, jetteLinked, jetteMissing = false }) {
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
        {jetteMissing && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 3,
              background: 'var(--warn-soft)',
              color: 'var(--warn)',
            }}
            title="최신 제때 가격파일에 이 제품코드가 없어요 — 단종됐거나 코드가 바뀌었을 수 있어요"
          >
            제때 미존재
          </span>
        )}
      </div>
    </td>
  );
}
