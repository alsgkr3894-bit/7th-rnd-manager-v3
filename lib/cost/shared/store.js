/** 레시피 store 공통 유틸 */

export function normalizeComponent(c) {
  return {
    productCode:    (c.productCode || '').trim() || null,
    ingredientName: (c.ingredientName || '').trim(),
    quantity:       c.quantity != null && c.quantity !== '' ? Number(c.quantity) : null,
    unit:           (c.unit || 'g').trim(),
    unitPrice:      c.unitPrice != null && c.unitPrice !== '' ? Number(c.unitPrice) : null,
    note:           (c.note || '').trim(),
  };
}
