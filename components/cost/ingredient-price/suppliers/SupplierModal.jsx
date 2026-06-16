'use client';

import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { supplierFormFromInitial } from './supplierViewUtils';

function SupplierField({ label, children, required = false }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
        {label}{' '}
        {required && <span style={{ color: 'var(--negative)', fontSize: 11 }}>*필수</span>}
      </div>
      {children}
    </div>
  );
}

export function SupplierModal({ initial, onSave, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => supplierFormFromInitial(initial));
  const [saving, setSaving] = useState(false);

  function set(field) {
    return event => setForm(prev => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      showToast('업체명을 입력해주세요', 'error');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame
      title={isEdit ? '공급업체 수정' : '공급업체 등록'}
      onClose={onClose}
      width="min(420px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SupplierField label="업체명" required>
          <input
            className="form-input"
            value={form.name}
            onChange={set('name')}
            placeholder="예) 대림수산, 이마트 트레이더스"
            autoFocus
          />
        </SupplierField>
        <SupplierField label="담당자">
          <input
            className="form-input"
            value={form.contact}
            onChange={set('contact')}
            placeholder="예) 홍길동 과장"
          />
        </SupplierField>
        <SupplierField label="연락처">
          <input
            className="form-input"
            value={form.phone}
            onChange={set('phone')}
            placeholder="예) 010-1234-5678"
          />
        </SupplierField>
        <SupplierField label="메모">
          <textarea
            className="form-input"
            value={form.memo}
            onChange={set('memo')}
            placeholder="추가 메모"
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </SupplierField>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? '저장 중…' : isEdit ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
