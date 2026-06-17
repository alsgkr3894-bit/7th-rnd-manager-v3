'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { OVERLAY_COLOR } from '@/lib/ui/styles';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { getDefaultPrice } from '@/lib/cost/menu-price';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { MenuMasterEditFields } from '@/components/menu-master/MenuMasterEditFields';

export function MenuMasterEditModal({
  row,
  isNew,
  onSave,
  onClose,
  presetCategories = [],
  onRecipeSaved,
}) {
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

  const missingFields = [];
  if (!form.menuCode.trim()) missingFields.push('메뉴코드');
  if (!form.menuName.trim()) missingFields.push('메뉴명');

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: OVERLAY_COLOR,
        zIndex: 400,
        display: 'grid',
        placeItems: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
        <div
          className="card"
          style={{
            width: 'min(960px, 96vw)',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {/* 상단 고정 헤더 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              borderBottom: '1px solid var(--divider)',
              background: 'var(--surface)',
              flexShrink: 0,
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {isNew ? '메뉴 추가' : '메뉴 수정'}
              </div>
              {!isNew && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  <span style={{ fontFamily: 'monospace' }}>{row?.menuCode}</span>
                  {row?.menuName && (
                    <span style={{ marginLeft: 8, color: 'var(--text-2)' }}>{row.menuName}</span>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {missingFields.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon.alert style={{ width: 12, height: 12 }} />
                  {missingFields.join(', ')} 필수
                </span>
              )}
              <button className="btn" onClick={onClose}>취소</button>
              <button className="btn primary" disabled={!canSave} onClick={submit}>저장</button>
              <button
                className="btn ghost"
                style={{ padding: '4px 8px' }}
                onClick={onClose}
                aria-label="닫기"
              >
                <Icon.close style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* 스크롤 본문 */}
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '20px 24px' }}>
            <MenuMasterEditFields
              row={row}
              isNew={isNew}
              form={form}
              errors={errors}
              setField={set}
              setErrors={setErrors}
              defaultPrice={defaultPrice}
              presetCategories={presetCategories}
              onRecipeSaved={onRecipeSaved}
            />
          </div>
        </div>
    </div>
  );

  return createPortal(modal, document.body);
}
