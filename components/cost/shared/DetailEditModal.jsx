'use client';
import { useState, useEffect } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { getAllIngredients, buildMetaOnlyRow } from '@/lib/ingredient';
import { ComponentRow } from './ComponentRow';
import { ModalFrame } from '@/components/ui/ModalFrame';

const EMPTY_COMPONENT = { productCode: null, ingredientName: '', quantity: '', unit: 'g', unitPrice: '' };
const COST_RATE_WARN_PCT = 35;

/**
 * 원가 상세 편집 모달 — pizza/personal/set/side 4종 모달의 공유 골격.
 *
 * Props:
 *   menu             — { menuCode, menuName, price, size? }
 *   initial          — 기존 레코드 (없으면 신규)
 *   onSave(payload)  — 저장 핸들러 (throws on failure)
 *   onClose()        — 닫기 핸들러
 *   calcCost(data)   — ({ components }) → 원가(원) 반환하는 순수 함수
 *   costLabel        — 원가 합계 레이블 (기본: '총 원가')
 *   costRatePrefix   — 원가율 앞 텍스트 (기본: '원가율')
 *   costRateSuffix   — 원가율 뒤 텍스트 (기본: '')
 *   titleSuffix      — 제목 뒤에 붙는 텍스트 (예: 사이즈 'L')
 *   infoBanner       — 폼 상단 안내 문자열 (없으면 생략)
 *   listIdPrefix     — datalist id prefix (예: 'pizza-detail')
 *   extraSaveFields  — onSave payload에 추가할 필드 (예: { size: 'L' })
 */
export function DetailEditModal({
  menu,
  initial,
  onSave,
  onClose,
  calcCost,
  costLabel      = '총 원가',
  costRatePrefix = '원가율',
  costRateSuffix = '',
  titleSuffix    = '',
  infoBanner     = null,
  listIdPrefix,
  extraSaveFields = {},
}) {
  const [components,   setComponents]   = useState(initial?.components || []);
  const [note,         setNote]         = useState(initial?.note || '');
  const [ingredients,  setIngredients]  = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllIngredients();
        setIngredients(all.filter(m => m.isSeeded || m.isManual).map(buildMetaOnlyRow));
      } catch (err) { console.warn(err); }
    })();
  }, []);

  function patchComponent(i, patch) {
    setComponents(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function removeComponent(i) {
    setComponents(prev => prev.filter((_, idx) => idx !== i));
  }
  function addComponent() {
    setComponents(prev => [...prev, { ...EMPTY_COMPONENT }]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        id: initial?.id,
        menuCode: menu.menuCode,
        menuName: menu.menuName,
        components,
        note,
        ...extraSaveFields,
      });
    } catch (err) {
      setSaveError(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  const totalCost  = calcCost({ components });
  const costRate   = (menu.price && totalCost > 0) ? (totalCost / menu.price * 100) : null;
  const listId     = `${listIdPrefix}-ing-options`;
  const title      = titleSuffix ? `${menu.menuName} ${titleSuffix}` : menu.menuName;

  const subtitle = (
    <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
      {menu.menuCode}
      {menu.price != null && <span style={{ marginLeft: 8 }}>· 판매가 {formatNumber(menu.price)}원</span>}
    </span>
  );

  return (
    <ModalFrame title={title} subtitle={subtitle} onClose={onClose}>
      {/* 안내 배너 */}
      {infoBanner && (
        <div style={{ padding:'8px 12px', marginBottom:16, fontSize:12, color:'var(--text-2)', background:'var(--accent-soft)', borderRadius:8, border:'1px solid var(--border)' }}>
          {infoBanner}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {/* 구성품 테이블 헤더 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 64px 100px 100px 28px', gap:6, fontSize:11, fontWeight:700, color:'var(--text-3)', paddingBottom:4, borderBottom:'1px solid var(--divider)' }}>
          <div>재료명</div>
          <div style={{ textAlign:'right' }}>수량</div>
          <div>단위</div>
          <div style={{ textAlign:'right' }}>단가(/단위)</div>
          <div style={{ textAlign:'right' }}>소계</div>
          <div/>
        </div>

        {/* 구성품 행 */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {components.map((c, i) => (
            <ComponentRow key={i} c={c} listId={listId} ingredients={ingredients}
              onChange={patch => patchComponent(i, patch)}
              onRemove={() => removeComponent(i)}/>
          ))}
          {components.length === 0 && (
            <div style={{ padding:'14px 0', textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
              구성품을 추가해주세요
            </div>
          )}
        </div>

        <datalist id={listId}>
          {ingredients.map(ing => (
            <option key={ing.productCode || ing.ingredientName} value={ing.ingredientName || ing.productName}/>
          ))}
        </datalist>

        <button type="button" className="btn sm" onClick={addComponent} style={{ alignSelf:'flex-start' }}>
          <Icon.plus style={{ width:13, height:13 }}/> 구성품 추가
        </button>

        {/* 비고 */}
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>비고</div>
          <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 입력"/>
        </div>

        {/* 원가 요약 */}
        <div style={{ padding:'12px 14px', background:'var(--surface-2)', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600 }}>{costLabel}</div>
            {costRate != null && (
              <div style={{ fontSize:11, color: costRate >= COST_RATE_WARN_PCT ? 'var(--negative)' : 'var(--text-3)', marginTop:2 }}>
                {costRatePrefix} {costRate.toFixed(1)}%{costRateSuffix}
              </div>
            )}
          </div>
          <span style={{ fontSize:20, fontWeight:800, color:'var(--accent)' }}>
            {formatNumber(totalCost)}<span style={{ fontSize:13, marginLeft:2 }}>원</span>
          </span>
        </div>

        {/* 저장 오류 */}
        {saveError && (
          <div style={{ fontSize:12, color:'var(--negative)', padding:'6px 10px', background:'var(--surface-2)', borderRadius:6 }}>
            저장 실패: {saveError}
          </div>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
