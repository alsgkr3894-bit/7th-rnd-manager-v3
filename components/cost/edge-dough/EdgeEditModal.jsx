'use client';
import { useState, useEffect } from 'react';
import {
  EDGE_TYPES,
  edgeTotalCost,
  edgeCodeOf,
  defaultExpandInMargin,
  defaultMarginSuffix,
} from '@/lib/cost/edge-dough';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { initDB } from '@/lib/db';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { EdgeComponentsSection } from './EdgeComponentsSection';
import { EdgeIdentityFields } from './EdgeIdentityFields';
import { EdgeMarginSettings } from './EdgeMarginSettings';
import { EdgeNoteField } from './EdgeNoteField';
import { EdgeTotalSummary } from './EdgeTotalSummary';

const EMPTY_COMP = () => ({
  productCode: null,
  ingredientName: '',
  quantity: '',
  unit: 'g',
  unitPrice: '',
});

export function EdgeEditModal({ initial, onSave, onClose }) {
  const isNew = !initial?.id;
  const [edgeType, setEdgeType] = useState(initial?.edgeType || EDGE_TYPES[0]);
  const [size, setSize] = useState(initial?.size || 'L');
  const [comps, setComps] = useState(() =>
    (initial?.components || []).map(c => ({ ...EMPTY_COMP(), ...c }))
  );
  const [note, setNote] = useState(initial?.note || '');
  const [expandInMargin, setExpandInMargin] = useState(
    initial?.expandInMargin != null
      ? !!initial.expandInMargin
      : defaultExpandInMargin(initial?.edgeType || EDGE_TYPES[0])
  );
  const [marginSuffix, setMarginSuffix] = useState(initial?.marginSuffix || '');
  const [allMeta, setAllMeta] = useState([]);
  const [upm, setUpm] = useState(new Map());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    (async () => {
      await initDB();
      const [files, meta] = await Promise.all([getPriceFiles(), getAllIngredients()]);
      const latest = files[0] || null;
      let priceRowMap = new Map();
      if (latest) {
        const rows = await getPriceRowsByFileId(latest.id);
        priceRowMap = buildPriceRowMap(rows).map;
      }
      setAllMeta(meta);
      setUpm(buildUnitPriceMap(meta, priceRowMap));
    })().catch(err => {
      console.error('[EdgeEditModal] 단가 데이터 로드 실패', err);
      showToast('단가 데이터를 불러오지 못했습니다.', 'error');
    });
  }, []);

  function patch(i, p) {
    setComps(prev => prev.map((c, idx) => (idx === i ? { ...c, ...p } : c)));
  }
  function handleRemoveItem(i) {
    setComps(prev => prev.filter((_, idx) => idx !== i));
  }
  function handleAddItem() {
    setComps(prev => [...prev, EMPTY_COMP()]);
  }
  function handleEdgeTypeChange(nextType) {
    setEdgeType(nextType);
    if (nextType === '씬도우') setSize('L');
  }

  function normalizeComponents() {
    const nextErrors = [];
    const components = comps.map((c, idx) => {
      const quantity = parseOptionalNonNegativeNumber(c.quantity);
      const unitPrice = parseOptionalNonNegativeNumber(c.unitPrice);
      if (!quantity.ok) nextErrors.push(`${idx + 1}번째 구성품 수량은 0 이상의 숫자만 입력하세요`);
      if (!unitPrice.ok) nextErrors.push(`${idx + 1}번째 구성품 단가는 0 이상의 숫자만 입력하세요`);
      return {
        ...c,
        quantity: quantity.value,
        unitPrice: unitPrice.value,
      };
    });
    return { components, errors: nextErrors };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const normalized = normalizeComponents();
    if (normalized.errors.length > 0) {
      setErrors(normalized.errors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        edgeCode: edgeCodeOf(edgeType, size),
        edgeType,
        size,
        components: normalized.components,
        note,
        expandInMargin,
        marginSuffix: marginSuffix.trim() || defaultMarginSuffix(edgeType),
      });
    } finally {
      setSaving(false);
    }
  }

  const total = edgeTotalCost({ components: comps });

  return (
    <ModalFrame
      title={isNew ? '엣지·도우 추가' : `${edgeType} ${size} 편집`}
      onClose={onClose}
      width="min(780px,96vw)"
      zIndex={300}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <EdgeIdentityFields
          edgeType={edgeType}
          size={size}
          isNew={isNew}
          onEdgeTypeChange={handleEdgeTypeChange}
          onSizeChange={setSize}
        />

        <EdgeComponentsSection
          components={comps}
          allMeta={allMeta}
          unitPriceMap={upm}
          errors={errors}
          onPatch={patch}
          onRemove={handleRemoveItem}
          onAdd={handleAddItem}
        />

        <EdgeNoteField value={note} onChange={setNote} />

        <EdgeMarginSettings
          edgeType={edgeType}
          expandInMargin={expandInMargin}
          marginSuffix={marginSuffix}
          onExpandChange={setExpandInMargin}
          onSuffixChange={setMarginSuffix}
        />

        <EdgeTotalSummary total={total} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
