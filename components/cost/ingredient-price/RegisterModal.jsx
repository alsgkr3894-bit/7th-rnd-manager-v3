'use client';
import { useState, useEffect } from 'react';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { formatNumber } from '@/lib/format';
import { SEED_MAIN_CATEGORIES, sortMainCategories } from '@/lib/ingredient';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { getAllSuppliers } from '@/lib/cost/suppliers/store';
import { recordPriceChange } from '@/lib/cost/price-history';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';

const UNIT_TYPES = ['g', 'kg', 'L', 'ml', '개', '캔', '팩', '봉', '병', 'EA', 'BOX'];

function InfoRow({ label, value }) {
  return (
    <div style={{display:'flex', gap:6, alignItems:'baseline'}}>
      <span style={{fontSize:11, color:'var(--text-3)', minWidth:60}}>{label}</span>
      <span style={{fontSize:12, color:'var(--text-1)', fontWeight:500}}>{value}</span>
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:6}}>
        {label}
        {hint && <span style={{fontSize:11, fontWeight:400, color:'var(--text-3)', marginLeft:6}}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function RegisterModal({ row, onSave, onClose, extraCategories = [] }) {
  const existing = row.meta;
  const catOptions = sortMainCategories([...new Set([...SEED_MAIN_CATEGORIES, ...extraCategories].filter(Boolean))]);
  const [ingredientName, setIngredientName] = useState(existing?.ingredientName || row.productName || '');
  const [category,       setCategory]       = useState(existing?.category || '');
  const [baseQuantity,   setBaseQuantity]   = useState(existing?.baseQuantity != null ? String(existing.baseQuantity) : '');
  const [baseUnitType,   setBaseUnitType]   = useState(existing?.baseUnitType || 'g');
  const [customCat,      setCustomCat]      = useState(
    !!existing?.category && !catOptions.includes(existing?.category)
  );
  const [supplierId,    setSupplierId]    = useState(existing?.supplierId   ?? '');
  const [supplierName,  setSupplierName]  = useState(existing?.supplierName ?? '');
  const [priceOverride, setPriceOverride] = useState(
    existing?.priceOverride != null ? String(existing.priceOverride) : ''
  );
  const [suppliers,    setSuppliers]    = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useKeyboardSave(() => { if (!saving) handleSubmit({ preventDefault() {} }); });

  // 공급업체 목록 로드
  useEffect(() => {
    let ignore = false;

    getAllSuppliers()
      .then(rows => {
        if (!ignore) setSuppliers(rows);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  function handleSupplierChange(e) {
    const val = e.target.value;
    if (!val) {
      setSupplierId('');
      setSupplierName('');
    } else {
      const id = Number(val);
      const found = suppliers.find(s => s.id === id);
      setSupplierId(id);
      setSupplierName(found ? found.name : '');
    }
  }

  function validateNumbers() {
    const next = {};
    const baseQty = parseOptionalNonNegativeNumber(baseQuantity);
    const override = parseOptionalNonNegativeNumber(priceOverride);

    if (!baseQty.ok) {
      next.baseQuantity = '포장수량은 0 이상 숫자만 입력하세요';
    }
    if (!override.ok) {
      next.priceOverride = '단가는 0 이상 숫자만 입력하세요';
    }

    return { errors: next, baseQty: baseQty.value, override: override.value };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validated = validateNumbers();
    if (Object.keys(validated.errors).length > 0) {
      setErrors(validated.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const newPriceOverride = validated.override;
      await onSave({
        ingredientName: ingredientName.trim() || row.productName,
        category:       category.trim(),
        baseQuantity:   validated.baseQty,
        baseUnitType:   baseUnitType,
        taxType:        row.taxType || '과세',
        supplierId:     supplierId   || null,
        supplierName:   supplierName || null,
        priceOverride:  newPriceOverride,
      });

      // 기존 식자재 수정 시 단가 변경 이력 기록 (best-effort)
      if (existing) {
        const oldPrice = existing.priceOverride ?? null;
        recordPriceChange({
          ingredientId:   existing.id,
          productCode:    existing.productCode ?? row.productCode,
          ingredientName: ingredientName.trim() || row.productName,
          oldPrice,
          newPrice:       newPriceOverride,
          source:         'register',
        }).catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  }

  const subtitle = (
    <span>제때 코드: <span style={{fontFamily:'monospace', color:'var(--accent)'}}>{row.productCode}</span></span>
  );

  return (
    <ModalFrame
      title={existing ? '마스터 정보 수정' : '마스터에 등록'}
      subtitle={subtitle}
      onClose={onClose}
      width="min(480px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
        <div style={{padding:'10px 12px', background:'var(--surface-2)', borderRadius:8,
          marginBottom:16, fontSize:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px'}}>
          <InfoRow label="제품명"      value={row.productName}/>
          <InfoRow label="부가세포함가" value={row.priceWithTax != null ? `${formatNumber(row.priceWithTax)}원` : '—'}/>
          <InfoRow label="온도"        value={row.temperature || '—'}/>
          <InfoRow label="과세구분"    value={row.taxType || '—'}/>
          <InfoRow label="판매단위"    value={row.salesUnit || '—'}/>
        </div>

        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:14}}>

          <FormField label="마스터 재료명" hint="비워두면 제때 제품명 자동 사용">
            <input className="form-input" value={ingredientName}
              onChange={e => setIngredientName(e.target.value)}
              placeholder={row.productName}/>
          </FormField>

          <FormField label="분류">
            <div style={{display:'flex', gap:6}}>
              {customCat ? (
                <input className="form-input" value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="직접 입력" style={{flex:1}}/>
              ) : (
                <select className="form-input" value={category}
                  onChange={e => setCategory(e.target.value)} style={{flex:1}}>
                  <option value="">미분류</option>
                  {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button type="button" className="btn" style={{whiteSpace:'nowrap', flexShrink:0}}
                onClick={() => { setCustomCat(v => !v); setCategory(''); }}>
                {customCat ? '목록에서 선택' : '직접 입력'}
              </button>
            </div>
          </FormField>

          <FormField label="포장수량" hint="개당 단가 계산에 사용 (예: 1000 g, 20 ea)">
            <div style={{display:'flex', gap:8}}>
              <input className="form-input" type="number" min="0" value={baseQuantity}
                onChange={e => setBaseQuantity(e.target.value)}
                placeholder="예) 1000" style={{flex:1}}/>
              <select className="form-input" value={baseUnitType}
                onChange={e => setBaseUnitType(e.target.value)} style={{width:80}}>
                {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {errors.baseQuantity && (
              <div style={{ fontSize: 12, color: 'var(--negative)', marginTop: 6 }}>
                {errors.baseQuantity}
              </div>
            )}
          </FormField>

          <FormField label="공급업체" hint="선택 안 하면 빈칸으로 저장">
            <select className="form-input" value={supplierId} onChange={handleSupplierChange}>
              <option value="">선택 안 함</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="단가 (직접 입력)" hint="비워두면 제때 연동가 사용">
            <input className="form-input" type="number" min="0" step="1"
              value={priceOverride}
              onChange={e => setPriceOverride(e.target.value)}
              placeholder="예) 5000"/>
            {errors.priceOverride && (
              <div style={{ fontSize: 12, color: 'var(--negative)', marginTop: 6 }}>
                {errors.priceOverride}
              </div>
            )}
          </FormField>

          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:4}}>
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? '저장 중…' : existing ? '수정' : '등록'}
            </button>
          </div>
        </form>
    </ModalFrame>
  );
}
