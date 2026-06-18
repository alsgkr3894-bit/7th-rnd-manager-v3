export function ManageRowNameCell({ name, productName, discontinued, originCount, allergenCount }) {
  return (
    <td style={{ fontWeight: 600, fontSize: 13 }}>
      <span title={productName && productName !== name ? `원본: ${productName}` : undefined}>
        {name}
      </span>
      {discontinued && <IngredientStatusBadge label="단종" />}
      {originCount > 0 && <IngredientStatusBadge label="원산지" tone="origin" />}
      {allergenCount > 0 && (
        <IngredientStatusBadge label={`알레르기 ${allergenCount}`} tone="allergen" />
      )}
    </td>
  );
}

function IngredientStatusBadge({ label, tone = 'neutral' }) {
  const toneStyle =
    tone === 'origin'
      ? { background: 'var(--positive-soft)', color: 'var(--positive)' }
      : tone === 'allergen'
        ? { background: 'var(--warn-soft)', color: 'var(--warn)' }
        : { background: 'var(--surface-3)', color: 'var(--text-3)' };

  return (
    <span
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
