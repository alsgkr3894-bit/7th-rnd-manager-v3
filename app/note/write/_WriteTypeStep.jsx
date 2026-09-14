'use client';
import { SegGroup } from '@/components/note/FormFields';
import { WRITE_TYPES, WRITE_TYPE_OPTIONS } from './writeTypes';

export function WriteTypeStep({ value, onChange, disabled = false }) {
  const descriptions = {
    [WRITE_TYPES.MENU_DEVELOPMENT]: '신규 메뉴 개발 노트를 작성합니다.',
    [WRITE_TYPES.MENU_IMPROVEMENT]: '기존 메뉴 개선과 차수 테스트를 기록합니다.',
    [WRITE_TYPES.SAMPLE_TEST]: '식자재 샘플 테스트 기록 양식으로 작성합니다.',
    [WRITE_TYPES.PRODUCT_ISSUE]: '제품 변경, 불량, 대체 등 식자재 이슈 양식으로 작성합니다.',
  };

  return (
    <section className="card" style={{ padding: 20, marginTop: 16 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <div className="card-title" style={{ marginBottom: 4 }}>
            작성 유형 선택
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            먼저 기록 유형을 선택하면 그 유형에 맞는 작성 양식이 열립니다.
          </div>
        </div>
        <SegGroup
          options={WRITE_TYPE_OPTIONS}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>
          {descriptions[value]}
        </div>
      </div>
    </section>
  );
}
