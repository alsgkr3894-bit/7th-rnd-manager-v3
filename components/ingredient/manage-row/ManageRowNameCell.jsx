export function ManageRowNameCell({
  name,
  productName,
  discontinued,
  originText,
  allergenText,
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
      {(originText || allergenText) && (
        <div className="ingredient-row-dash">
          {originText && (
            <div className="ingredient-row-dash-item">
              <span className="ingredient-row-dash-label">원산지</span>
              <span className="ingredient-row-dash-value">{originText}</span>
            </div>
          )}
          {allergenText && (
            <div className="ingredient-row-dash-item">
              <span className="ingredient-row-dash-label allergen">알레르기</span>
              <span className="ingredient-row-dash-value">{allergenText}</span>
            </div>
          )}
        </div>
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
