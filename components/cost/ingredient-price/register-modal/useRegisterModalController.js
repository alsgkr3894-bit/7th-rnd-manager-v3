import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllSuppliers } from '@/lib/cost/suppliers/store';
import {
  buildInitialRegisterForm,
  buildRegisterCategoryOptions,
  buildRegisterPayload,
  validateRegisterForm,
} from './registerModalUtils';

export function useRegisterModalController({ row, onSave, extraCategories }) {
  const existing = row.meta;
  const categoryOptions = useMemo(
    () => buildRegisterCategoryOptions(extraCategories),
    [extraCategories]
  );
  const [form, setForm] = useState(() => buildInitialRegisterForm(row, categoryOptions));
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let ignore = false;

    getAllSuppliers()
      .then(rows => {
        if (!ignore) setSuppliers(rows);
      })
      .catch(err => {
        console.warn('[RegisterModal] 공급업체 목록 로드 실패:', err);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const setField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleCategoryMode = useCallback(() => {
    setForm(prev => ({ ...prev, customCat: !prev.customCat, category: '' }));
  }, []);

  const handleSupplierChange = useCallback(
    event => {
      const value = event.target.value;
      if (!value) {
        setForm(prev => ({ ...prev, supplierId: '', supplierName: '' }));
        return;
      }

      const id = Number(value);
      const found = suppliers.find(supplier => supplier.id === id);
      setForm(prev => ({
        ...prev,
        supplierId: id,
        supplierName: found ? found.name : '',
      }));
    },
    [suppliers]
  );

  const handleSubmit = useCallback(
    async event => {
      event.preventDefault();
      const validated = validateRegisterForm(form);
      if (Object.keys(validated.errors).length > 0) {
        setErrors(validated.errors);
        return;
      }

      setErrors({});
      setSaving(true);
      try {
        const payload = buildRegisterPayload({ row, form, validated });
        await onSave(payload);
      } finally {
        setSaving(false);
      }
    },
    [form, onSave, row]
  );

  return {
    existing,
    categoryOptions,
    form,
    suppliers,
    saving,
    errors,
    setField,
    toggleCategoryMode,
    handleSupplierChange,
    handleSubmit,
  };
}
