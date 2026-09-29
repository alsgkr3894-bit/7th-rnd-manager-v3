'use client';
import { useState, useEffect, useRef } from 'react';
import {
  EDGE_TYPES,
  edgeTotalCost,
  edgeCodeOf,
  defaultExpandInMargin,
  defaultMarginSuffix,
  normalizeMarginSuffix,
} from '@/lib/cost/edge-dough';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { initDB } from '@/lib/db';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { useMounted } from '@/hooks/useMounted';
import { parseOptionalNonNegativeNumber, parseOptionalNumber } from '@/lib/parse';
import { refreshEdgeComponentPrices } from '@/lib/cost/edge-dough/price-sync';
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
  // 비동기 로드가 끝나는 시점의 최신 구성품을 읽기 위해(그 사이 사용자가 고친 값을 덮지 않게)
  const compsRef = useRef(comps);
  compsRef.current = comps;
  const [note, setNote] = useState(initial?.note || '');
  const [expandInMargin, setExpandInMargin] = useState(
    initial?.expandInMargin != null
      ? !!initial.expandInMargin
      : defaultExpandInMargin(initial?.edgeType || EDGE_TYPES[0])
  );
  const [marginSuffix, setMarginSuffix] = useState(() =>
    initial?.marginSuffix
      ? normalizeMarginSuffix(initial?.edgeType || EDGE_TYPES[0], initial.marginSuffix)
      : ''
  );
  const [allMeta, setAllMeta] = useState([]);
  const [upm, setUpm] = useState(new Map());
  // 열 때 최신 식자재 단가로 바뀐 구성품 수 — 저장해야 반영되므로 안내만 한다
  const [refreshedCount, setRefreshedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const mountedRef = useMounted();

  useEffect(() => {
    let alive = true;
    (async () => {
      await initDB();
      const [files, meta] = await Promise.all([getPriceFiles(), getAllIngredients()]);
      const latest = files[0] || null;
      let priceRowMap = new Map();
      if (latest) {
        const rows = await getPriceRowsByFileId(latest.id);
        priceRowMap = buildPriceRowMap(rows).map;
      }
      if (!alive) return;
      const nextUpm = buildUnitPriceMap(meta, priceRowMap);
      setAllMeta(meta);
      setUpm(nextUpm);
      // 이미 저장된 구성품의 단가도 최신 식자재 단가로 맞춘다(코드 없는 옛 구성품은 이름으로 연결)
      const result = refreshEdgeComponentPrices(compsRef.current, meta, nextUpm);
      if (result.components.some((c, i) => c !== compsRef.current[i])) setComps(result.components);
      if (result.changed > 0) setRefreshedCount(result.changed);
    })().catch(err => {
      if (!alive) return;
      console.error('[EdgeEditModal] 단가 데이터 로드 실패', err);
      showToast('단가 데이터를 불러오지 못했습니다.', 'error');
    });
    return () => {
      alive = false;
    };
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
      const quantity = parseOptionalNumber(c.quantity);
      const unitPrice = parseOptionalNonNegativeNumber(c.unitPrice);
      if (!quantity.ok) nextErrors.push(`${idx + 1}번째 구성품 수량은 숫자만 입력하세요`);
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
      if (mountedRef.current) setSaving(false);
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
          refreshedCount={refreshedCount}
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
