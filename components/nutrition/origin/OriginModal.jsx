'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import MenuCodePicker, { getBaseCode } from '@/components/ui/MenuCodePicker';
import { upsertOrigin } from '@/lib/nutrition/origin/store';

const QUICK_ITEMS = ['쇠고기', '돼지고기', '닭고기', '오리고기', '쌀', '배추', '콩', '고등어', '오징어', '낙지', '명태', '참치'];

const emptyItem = () => ({ displayName: '', originCountry: '', originRegion: '' });

function toItems(origin) {
  if (origin?.items?.length) return origin.items.map(i => ({ ...emptyItem(), ...i }));
  return [{ displayName: origin?.displayName ?? '', originCountry: origin?.originCountry ?? '', originRegion: origin?.originRegion ?? '' }];
}

function ItemRow({ item, idx, total, onChange, onRemove }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          품목 {idx + 1}
        </span>
        {total > 1 && (
          <button type="button" onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: '2px 4px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
            제거
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {QUICK_ITEMS.map(q => (
          <button key={q} type="button"
            onClick={() => onChange('displayName', q)}
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: '1px solid',
              borderColor: item.displayName === q ? 'var(--accent)' : 'var(--border)',
              background: item.displayName === q ? 'var(--accent-soft)' : 'var(--surface)',
              color: item.displayName === q ? 'var(--accent-text)' : 'var(--text-2)',
            }}>
            {q}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>표시품목 *</label>
        <input className="input" style={{ fontSize: 13 }}
          value={item.displayName}
          onChange={e => onChange('displayName', e.target.value)}
          placeholder="예: 닭고기" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>원산지 *</label>
          <input className="input" style={{ fontSize: 13 }}
            value={item.originCountry}
            onChange={e => onChange('originCountry', e.target.value)}
            placeholder="예: 국내산" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>세부 (선택)</label>
          <input className="input" style={{ fontSize: 13 }}
            value={item.originRegion}
            onChange={e => onChange('originRegion', e.target.value)}
            placeholder="예: 경기도" />
        </div>
      </div>
    </div>
  );
}

export function OriginModal({ origin, ingredients, linkedIds, menuMasters, onSave, onClose }) {
  const isEdit = !!origin;

  const [selId, setSelId]         = useState(origin?.ingredientId ?? null);
  const [menuLinks, setMenuLinks] = useState(() => {
    if (origin?.menuCodes?.length) return origin.menuCodes;
    if (origin?.menuCode) return [{ menuCode: origin.menuCode, menuName: origin.menuName || '' }];
    return [];
  });
  const [pickerKey, setPickerKey] = useState(0);
  const [items, setItems]         = useState(() => toItems(origin));
  const [note, setNote]           = useState(origin?.note ?? '');
  const [search, setSearch]       = useState('');
  const [saving, setSaving]       = useState(false);

  const selIng = ingredients.find(i => i.id === selId);

  const filtered = useMemo(() => {
    if (isEdit) return [];
    const q = search.toLowerCase();
    const matched = ingredients.filter(i =>
      !q ||
      (i.ingredientName || '').toLowerCase().includes(q) ||
      (i.productCode || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
    const unlinked = matched.filter(i => !linkedIds.has(i.id));
    const linked   = matched.filter(i =>  linkedIds.has(i.id));
    return [...unlinked, ...linked].slice(0, 80);
  }, [ingredients, linkedIds, search, isEdit]);

  const handleAddMenu = (code) => {
    if (!code) return;
    const found = menuMasters.find(m => getBaseCode(m) === code || m.menuCode === code);
    setMenuLinks(prev => prev.some(l => l.menuCode === code) ? prev : [...prev, { menuCode: code, menuName: found?.menuName || '' }]);
    setPickerKey(k => k + 1);
  };

  const removeMenuLink = (idx) => setMenuLinks(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!selId) { showToast('식재료를 선택해주세요', 'error'); return; }
    const validItems = items.filter(it => it.displayName.trim() && it.originCountry.trim());
    if (validItems.length === 0) { showToast('표시품목과 원산지를 하나 이상 입력해주세요', 'error'); return; }
    setSaving(true);
    try {
      await upsertOrigin({
        ...(origin?.id ? { id: origin.id } : {}),
        ingredientId: selId,
        productCode: selIng?.productCode || null,
        ingredientName: selIng?.ingredientName || (isEdit ? origin.ingredientName : ''),
        menuCodes: menuLinks,
        menuCode: menuLinks[0]?.menuCode || null,
        menuName: menuLinks[0]?.menuName || '',
        items: validItems,
        displayName: validItems[0].displayName,
        originCountry: validItems[0].originCountry,
        originRegion: validItems[0].originRegion,
        note: note.trim(),
      });
      showToast(isEdit ? '수정 완료' : '등록 완료', 'ok');
      await onSave();
    } catch { showToast('저장 실패', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <ModalFrame
      title={isEdit ? '원산지 수정' : '식재료 원산지 등록'}
      onClose={onClose}
      width="min(560px,95vw)"
      zIndex={300}
      padding="24px 28px"
      maxHeight="90vh"
    >

        {!isEdit && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>식재료 선택 *</label>
            {selIng ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 8, border: '1.5px solid var(--accent)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-text)' }}>{selIng.ingredientName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{selIng.productCode || '수동 등록'} · {selIng.category || '미분류'}</div>
                </div>
                <button className="btn sm ghost" onClick={() => setSelId(null)}>변경</button>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
                  <input className="input" style={{ paddingLeft: 32 }}
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="재료명·코드·분류로 검색" autoFocus />
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  {filtered.length === 0
                    ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                        {search ? '검색 결과 없음' : '미연결 식재료가 없습니다'}
                      </div>
                    : filtered.map(ing => {
                        const isLinked = linkedIds.has(ing.id);
                        return (
                          <div key={ing.id}
                            onClick={isLinked ? undefined : () => setSelId(ing.id)}
                            style={{
                              padding: '8px 12px', borderRadius: 6, margin: '2px 4px',
                              cursor: isLinked ? 'default' : 'pointer',
                              opacity: isLinked ? 0.45 : 1,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}
                            onMouseEnter={e => { if (!isLinked) e.currentTarget.style.background = 'var(--surface-2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{ing.ingredientName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{ing.productCode || '수동 등록'} · {ing.category || '미분류'}</div>
                            </div>
                            {isLinked && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>
                                연결됨
                              </span>
                            )}
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {isEdit && (
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{origin.ingredientName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{origin.productCode || '수동 등록'}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
            메뉴명 <span style={{ color: 'var(--text-4)' }}>(원산지가 표시될 메뉴, 여러 개 선택 가능)</span>
          </label>
          {menuLinks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {menuLinks.map(({ menuCode, menuName }, idx) => (
                <span key={menuCode} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--accent-soft)', border: '1px solid var(--accent)',
                  borderRadius: 6, padding: '3px 8px', fontSize: 12,
                }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-text)', fontSize: 11 }}>{menuCode}</span>
                  {menuName && <span style={{ color: 'var(--text-2)' }}>{menuName}</span>}
                  <button type="button" onClick={() => removeMenuLink(idx)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0 2px', lineHeight: 1, fontSize: 13 }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <MenuCodePicker
            key={pickerKey}
            menuMasters={menuMasters}
            value=""
            onChange={handleAddMenu}
            placeholder={menuLinks.length === 0 ? '메뉴를 선택하세요' : '+ 메뉴 추가…'}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>
              표시품목 · 원산지
            </label>
            <button type="button" className="btn sm" onClick={addItem}
              style={{ fontSize: 12, padding: '4px 10px' }}>
              <Icon.plus style={{ width: 12, height: 12 }} /> 항목 추가
            </button>
          </div>
          {items.map((item, idx) => (
            <ItemRow
              key={idx}
              item={item} idx={idx} total={items.length}
              onChange={(field, val) => updateItem(idx, field, val)}
              onRemove={() => removeItem(idx)}
            />
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>비고</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="참고사항" />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || (!isEdit && !selId)}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
    </ModalFrame>
  );
}
