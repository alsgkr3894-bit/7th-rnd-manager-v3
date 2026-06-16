'use client';

import { Icon } from '@/components/icons';
import { SectionLabel } from '@/components/cost/shared/FormLabels';

export function GroupEditorSizeFields({ sizes, onSize, onAdd, onRemove }) {
  return (
    <>
      <SectionLabel>사이즈 레이블</SectionLabel>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {sizes.map((size, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                className="form-input"
                value={size}
                onChange={event => onSize(index, event.target.value)}
                placeholder="L"
                style={{ width: 60 }}
              />
              {sizes.length > 1 && (
                <button
                  className="btn"
                  style={{ padding: '3px 6px' }}
                  onClick={() => onRemove(index)}
                >
                  <Icon.close style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
          ))}
          <button className="btn" style={{ fontSize: 12 }} onClick={onAdd}>
            <Icon.plus style={{ width: 12, height: 12 }} /> 추가
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
          메뉴마스터 레시피에서 체크할 수 있는 사이즈 후보입니다
        </div>
      </div>
    </>
  );
}
