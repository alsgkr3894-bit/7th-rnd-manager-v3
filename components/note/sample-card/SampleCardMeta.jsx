export function SampleCardMeta({ names, testDate, company, price, priceTaxType }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: 'var(--text-3)',
        marginBottom: 8,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {names && <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{names}</span>}
      {testDate && <span>· {testDate}</span>}
      {company && <span>· {company}</span>}
      {price && (
        <span>
          · {price}원{priceTaxType === 'excl' ? '(별도)' : ''}
        </span>
      )}
    </div>
  );
}
