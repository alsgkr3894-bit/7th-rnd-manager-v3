'use client';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { RegisterModalActions } from './register-modal/RegisterModalActions';
import { RegisterModalBasicFields } from './register-modal/RegisterModalBasicFields';
import { RegisterModalCostFields } from './register-modal/RegisterModalCostFields';
import { RegisterModalInfoPanel } from './register-modal/RegisterModalInfoPanel';
import { useRegisterModalController } from './register-modal/useRegisterModalController';

export function RegisterModal({ row, onSave, onClose, extraCategories = [] }) {
  const controller = useRegisterModalController({ row, onSave, extraCategories });
  const {
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
  } = controller;

  useKeyboardSave(() => {
    if (!saving) handleSubmit({ preventDefault() {} });
  });

  const subtitle = (
    <span>
      제때 코드:{' '}
      <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{row.productCode}</span>
    </span>
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
      <RegisterModalInfoPanel row={row} />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <RegisterModalBasicFields
          row={row}
          form={form}
          categoryOptions={categoryOptions}
          setField={setField}
          onToggleCustom={toggleCategoryMode}
        />
        <RegisterModalCostFields
          form={form}
          suppliers={suppliers}
          errors={errors}
          setField={setField}
          onSupplierChange={handleSupplierChange}
        />
        <RegisterModalActions saving={saving} existing={existing} onClose={onClose} />
      </form>
    </ModalFrame>
  );
}
