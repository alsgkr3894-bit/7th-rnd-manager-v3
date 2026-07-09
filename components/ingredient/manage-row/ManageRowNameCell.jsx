export function ManageRowNameCell({
  name,
  productName,
  discontinued,
  originCount,
  allergenCount,
  replacedByProductCode,
  replacedFromProductCode,
  codeNameMap,
}) {
  const replacedByName = replacedByProductCode ? codeNameMap?.get(replacedByProductCode) : null;
  const replacedFromName = replacedFromProductCode
    ? codeNameMap?.get(replacedFromProductCode)
    : null;
  return (
    <td style={{ fontWeight: 600, fontSize: 13 }}>
      <span title={productName && productName !== name ? `원본: ${productName}` : undefined}>
        {name}
      </span>
      {discontinued && <IngredientStatusBadge label="단종" />}
      {discontinued && replacedByProductCode && (
        <IngredientStatusBadge
          label={`→ ${replacedByName || replacedByProductCode}로 대체됨`}
          tone="replace"
          title={`대체 제품: ${replacedByName || '-'} (${replacedByProductCode})`}
        />
      )}
      {!discontinued && replacedFromProductCode && (
        <IngredientStatusBadge
          label="대체 흡수"
          tone="replace"
          title={`이전 제품: ${replacedFromName || '-'} (${replacedFromProductCode})`}
        />
      )}
      {originCount > 0 && <IngredientStatusBadge label="원산지" tone="origin" />}
      {allergenCount > 0 && (
        <IngredientStatusBadge label={`알레르기 ${allergenCount}`} tone="allergen" />
      )}
    </td>
  );
}

function IngredientStatusBadge({ label, tone = 'neutral', title }) {
  const toneStyle =
    tone === 'origin'
      ? { background: 'var(--positive-soft)', color: 'var(--positive)' }
      : tone === 'allergen'
        ? { background: 'var(--warn-soft)', color: 'var(--warn)' }
        : tone === 'replace'
          ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
          : { background: 'var(--surface-3)', color: 'var(--text-3)' };

  return (
    <span
      title={title}
      style={{
        marginLeft: tone === 'neutral' ? 6 : 4,
        fontSize: tone === 'neutral' ? 10 : 9,
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 3,
        ...toneStyle,
      }}
    >
      {label}
    </span>
  );
}
