'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { saveIngredientAllergens } from '@/lib/nutrition/allergen/store';
import MenuCodePicker from '@/components/ui/MenuCodePicker';

const INGREDIENT_SEARCH_LIMIT = 60;

/**
 * 식재료 선택 + 알레르기 항목 체크 모달.
 *
 * @param {object|null} link         - 편집 대상 링크 (null이면 신규 등록)
 * @param {object[]}    ingredients  - 전체 식재료 목록 (미연결 필터용)
 * @param {Set}         linkedIds    - 이미 연결된 ingredientId Set
 * @param {object[]}    allergens    - 법정 알레르기 마스터
 * @param {object[]}    menuMasters  - 메뉴 마스터 (MenuCodePicker용)
 * @param {() => void}  onSave       - 저장 성공 후 콜백
 * @param {() => void}  onClose
 */
export function AllergenModal({ link, ingredients, linkedIds, allergens, menuMasters, onSave, onClose }) {
  const isEdit = !!link;

  const [selId,       setSelId]       = useState(link?.ingredientId ?? null);
  const [displayName, setDisplayName] = useState(link?.displayName ?? '');
  const [menuCode,    setMenuCode]    = useState(link?.menuCode ?? '');
  const [checked,     setChecked]     = useState(new Set(link?.allergenCodes ?? []));
  const [search,      setSearch]      = useState('');
  const [saving,      setSaving]      = useState(false);

  const selIng = ingredients.find(i => i.id === selId);

  const filteredIngs = useMemo(() => {
    if (isEdit) return [];
    const q = search.toLowerCase();
    return ingredients
      .filter(i => !linkedIds.has(i.id))
      .filter(i => !q
        || (i.ingredientName || '').toLowerCase().includes(q)
        || (i.productCode    || '').toLowerCase().includes(q)
        || (i.category       || '').toLowerCase().includes(q)
      )
      .slice(0, INGREDIENT_SEARCH_LIMIT);
  }, [ingredients, linkedIds, search, isEdit]);

  function handleSelect(ing) {
    setSelId(ing.id);
    if (!displayName) setDisplayName(ing.ingredientName);
  }

  function toggleAllergen(code) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  async function handleSave() {
    if (!selId) { showToast('식재료를 선택해주세요', 'err'); return; }
    setSaving(true);
    try {
      await saveIngredientAllergens({
        ...(link?.id ? { id: link.id } : {}),
        ingredientId:   selId,
        productCode:    selIng?.productCode || null,
        ingredientName: selIng?.ingredientName || link?.ingredientName || '',
        displayName:    displayName.trim() || selIng?.ingredientName || '',
        allergenCodes:  [...checked],
        menuCode,
      });
      showToast(isEdit ? '수정 완료' : '등록 완료', 'ok');
      onSave();
    } catch {
      showToast('저장 실패', 'err');
    }
    setSaving(false);
  }

  return (
    <ModalFrame
      title={isEdit ? '알레르기 편집' : '식재료 알레르기 등록'}
      onClose={onClose}
      width="min(580px,95vw)"
      zIndex={300}
      padding="24px 28px"
      maxHeight="90vh"
    >
      {/* 식재료 선택 — 신규 등록 모드 */}
      {!isEdit && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>식재료 선택 *</label>
          {selIng ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 8, border: '1.5px solid var(--accent)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-text)' }}>{selIng.ingredientName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{selIng.productCode || '수동 등록'} · {selIng.category || '미분류'}</div>
              </div>
              <button className="btn sm ghost" onClick={() => { setSelId(null); setDisplayName(''); }}>변경</button>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
                <input className="input" style={{ paddingLeft: 32 }} value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="재료명·코드·분류로 검색" autoFocus />
              </div>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                {filteredIngs.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                    {search ? '검색 결과 없음' : '미연결 식재료가 없습니다'}
                  </div>
                ) : filteredIngs.map(ing => (
                  <div key={ing.id} onClick={() => handleSelect(ing)}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{ing.ingredientName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{ing.productCode || '수동 등록'} · {ing.category || '미분류'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 편집 모드 — 식재료 표시 */}
      {isEdit && (
        <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{link.ingredientName}</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{link.productCode || '수동 등록'}</div>
        </div>
      )}

      {/* 출력 표기명 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
          출력용 표기명 <span style={{ color: 'var(--text-4)' }}>(비우면 재료명 그대로 출력)</span>
        </label>
        <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)}
          placeholder={selIng?.ingredientName || link?.ingredientName || '예: 밀'} />
      </div>

      {/* 알레르기 체크 */}
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
          포함된 알레르기 항목 선택 <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>({checked.size}개 선택)</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allergens.map(al => {
            const isChecked = checked.has(al.allergenCode);
            return (
              <button key={al.allergenCode} onClick={() => toggleAllergen(al.allergenCode)}
                style={{
                  padding: '5px 13px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                  borderColor: isChecked ? 'var(--accent)' : 'var(--border)',
                  background:  isChecked ? 'var(--accent-soft)' : 'var(--surface)',
                  color:       isChecked ? 'var(--accent-text)' : 'var(--text-2)',
                  fontWeight:  isChecked ? 700 : 400, transition: 'all 100ms',
                }}>
                {al.allergenName}
              </button>
            );
          })}
        </div>
      </div>

      {/* 관련 메뉴 */}
      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
          관련 메뉴 <span style={{ color: 'var(--text-4)' }}>(선택)</span>
        </label>
        <MenuCodePicker menuMasters={menuMasters} value={menuCode} onChange={setMenuCode} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn" onClick={() => setChecked(new Set())}>전체 해제</button>
        <button className="btn ghost" onClick={onClose}>취소</button>
        <button className="btn primary" onClick={handleSave} disabled={saving || (!isEdit && !selId)}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </ModalFrame>
  );
}
