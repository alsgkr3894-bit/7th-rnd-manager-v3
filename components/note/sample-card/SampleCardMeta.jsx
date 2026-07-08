export function SampleCardMeta({
  names,
  ingredientGroupName,
  recordType,
  testDate,
  roundLabel,
  isChained,
  company,
  price,
  priceTaxType,
}) {
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
      {recordType && <span className="chip">{recordType}</span>}
      {ingredientGroupName && (
        <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{ingredientGroupName}</span>
      )}
      {names && <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{names}</span>}
      {testDate && <span>· {testDate}</span>}
      {roundLabel && <span>· {roundLabel}</span>}
      {isChained && <span>· 차수 연결</span>}
      {company && <span>· {company}</span>}
      {price && (
        <span>
          · {price}원{priceTaxType === 'excl' ? '(별도)' : ''}
        </span>
      )}
    </div>
  );
}
