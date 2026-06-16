export function emptySupplierForm() {
  return { name: '', contact: '', phone: '', memo: '' };
}

export function supplierFormFromInitial(initial) {
  if (!initial) return emptySupplierForm();
  return {
    name: initial.name || '',
    contact: initial.contact || '',
    phone: initial.phone || '',
    memo: initial.memo || '',
  };
}

export function filterSuppliers(suppliers, search) {
  const query = String(search || '')
    .trim()
    .toLowerCase();
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  if (!query) return safeSuppliers;

  return safeSuppliers.filter(
    supplier =>
      String(supplier?.name || '')
        .toLowerCase()
        .includes(query) ||
      String(supplier?.contact || '')
        .toLowerCase()
        .includes(query) ||
      String(supplier?.phone || '')
        .toLowerCase()
        .includes(query)
  );
}
