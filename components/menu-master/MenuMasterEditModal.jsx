'use client';
import { useState, useEffect } from 'react';
import { Icon } from '@/components/icons';
import { OVERLAY_COLOR } from '@/lib/ui/styles';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { getDefaultPrice } from '@/lib/cost/menu-price';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import { SUB_TAG_STYLE, CAT_TAG_STYLE } from '@/lib/ui/colors';
import { MenuRecipeSection } from './MenuRecipeSection';

export function CategoryTags({ menuCode }) {
  if (!menuCode) return null;
  const parts = menuCode.toUpperCase().split('-');
  const sub = parts[1];
  const subStyle = SUB_TAG_STYLE[sub];
  const { category } = parseCategoryFromCode(menuCode);
  const catKey = category?.split('/')[0];
  const catStyle = CAT_TAG_STYLE[catKey] || { bg: 'var(--surface-2)', color: 'var(--text-3)' };
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 999,
          background: catStyle.bg,
          color: catStyle.color,
        }}
      >
        {catKey || '—'}
      </span>
      {subStyle && subStyle.label !== catKey && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 999,
            background: subStyle.bg,
            color: subStyle.color,
          }}
        >
          {subStyle.label}
        </span>
      )}
    </div>
  );
}

export function MenuMasterEditModal({ row, isNew, onSave, onClose, presetCategories = [] }) {
  const [form, setForm] = useState({
    menuCode: row?.menuCode || '',
    menuName: row?.menuName || '',
    category: row?.category || presetCategories[0] || '',
    size: row?.size || '',
    price: row?.price != null ? String(row.price) : '',
    status: row?.status || 'active',
    note: row?.note || '',
    excludeFromOrigin: row?.excludeFromOrigin === true,
  });
  const [errors, setErrors] = useState({});
  const set = makeFieldUpdater(setForm);
  const defaultPrice = getDefaultPrice(form.menuCode);
  const canSave = form.menuCode.trim() && form.menuName.trim();

  function submit() {
    const errs = {};
    if (!form.menuCode.trim()) errs.menuCode = '메뉴코드를 입력하세요';
    if (!form.menuName.trim()) errs.menuName = '메뉴명을 입력하세요';
    const price = parseOptionalNonNegativeNumber(form.price);
    if (!price.ok) errs.price = '판매가는 0 이상의 숫자만 입력하세요';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSave({
      ...(row || {}),
      menuCode: form.menuCode.trim(),
      menuName: form.menuName.trim(),
      category: form.category,
      size: form.size.trim() || null,
      price: price.value,
      status: form.status,
      note: form.note,
      excludeFromOrigin: form.excludeFromOrigin,
    });
  }
  useKeyboardSave(submit);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: OVERLAY_COLOR,
        display: 'grid',
        placeItems: 'center',
        zIndex: 300,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(440px,95vw)',
          padding: '24px 28px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>{isNew ? '메뉴 추가' : '메뉴 수정'}</div>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 메뉴코드 — 신규는 입력, 기존은 읽기전용 */}
          <div>
            <label
              style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
            >
              메뉴코드
            </label>
            {isNew ? (
              <>
                <input
                  className="input"
                  value={form.menuCode}
                  onChange={e => {
                    set('menuCode', e.target.value.toUpperCase());
                    setErrors(p => ({ ...p, menuCode: undefined }));
                  }}
                  placeholder="예) P-OR-005-L"
                  style={{ fontFamily: 'monospace' }}
                  aria-describedby={errors.menuCode ? 'menu-master-code-error' : undefined}
                />
                {errors.menuCode && (
                  <div
                    id="menu-master-code-error"
                    role="alert"
                    style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4 }}
                  >
                    {errors.menuCode}
                  </div>
                )}
                <div style={{ marginTop: 6 }}>
                  <CategoryTags menuCode={form.menuCode} />
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-text)' }}
                >
                  {row.menuCode}
                </span>
                <CategoryTags menuCode={row.menuCode} />
              </div>
            )}
          </div>

          <div>
            <label
              style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
            >
              메뉴명
            </label>
            <input
              className="input"
              value={form.menuName}
              onChange={e => {
                set('menuName', e.target.value);
                setErrors(p => ({ ...p, menuName: undefined }));
              }}
              placeholder="예) 슈퍼콤비네이션"
              aria-describedby={errors.menuName ? 'menu-master-name-error' : undefined}
            />
            {errors.menuName && (
              <div
                id="menu-master-name-error"
                role="alert"
                style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4 }}
              >
                {errors.menuName}
              </div>
            )}
          </div>

          {/* 분류 + 규격 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
              >
                카테고리
              </label>
              {presetCategories.length > 0 ? (
                <select
                  className="input"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                >
                  {presetCategories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  placeholder="예) 탕수육 / 짜장 / 세트"
                />
              )}
            </div>
            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
              >
                규격(사이즈)
              </label>
              <input
                className="input"
                value={form.size}
                onChange={e => set('size', e.target.value)}
                placeholder="L / R / 단일"
              />
            </div>
          </div>

          <div>
            <label
              style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
            >
              판매가 (부가세 포함)
              {defaultPrice && (
                <span style={{ marginLeft: 8, color: 'var(--text-4)' }}>
                  기본가 {defaultPrice.toLocaleString()}원
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                type="number"
                min="0"
                value={form.price}
                aria-describedby={errors.price ? 'menu-master-price-error' : undefined}
                onChange={e => set('price', e.target.value)}
                placeholder={defaultPrice ? String(defaultPrice) : '직접 입력'}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>원</span>
              {defaultPrice && !form.price && (
                <button className="btn sm" onClick={() => set('price', String(defaultPrice))}>
                  기본가 적용
                </button>
              )}
            </div>
            {errors.price && (
              <div
                id="menu-master-price-error"
                style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}
              >
                {errors.price}
              </div>
            )}
          </div>

          <div>
            <label
              style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
            >
              상태
            </label>
            <select
              className="input"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              <option value="active">활성</option>
              <option value="discontinued">단종</option>
              <option value="test">테스트</option>
            </select>
          </div>

          <div>
            <label
              style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
            >
              비고
            </label>
            <input
              className="input"
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="선택 입력"
            />
          </div>

          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={form.excludeFromOrigin}
                onChange={e => set('excludeFromOrigin', e.target.checked)}
                style={{ accentColor: 'var(--warn)', width: 15, height: 15 }}
              />
              <span style={{ fontWeight: 600 }}>원산지·알레르기 출력에서 제외</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                (패밀리박스·하프앤하프 등 공통 구성품이 겹치는 메뉴)
              </span>
            </label>
          </div>

          {/* ── 레시피 구성품 (원가 detail store 연동) ── */}
          {!isNew && form.menuCode && form.category && (
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
              <MenuRecipeSection
                menuCode={form.menuCode}
                menuName={form.menuName}
                category={form.category}
                size={form.size || '단일'}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" disabled={!canSave} onClick={submit}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
