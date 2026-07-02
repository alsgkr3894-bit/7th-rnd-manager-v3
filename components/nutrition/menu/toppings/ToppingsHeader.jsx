'use client';

import { Icon } from '@/components/icons';

export function ToppingsHeader({ onAdd, onImport, onTemplate, canEdit = false }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 800 }}>추가토핑 영양성분</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          식자재코드를 연결하면 식자재 관리의 알레르기 정보가 표출력에 함께 반영됩니다.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="btn sm" type="button" onClick={onTemplate}>
          <Icon.download style={{ width: 13, height: 13 }} />
          양식 다운로드
        </button>
        <button className="btn sm" type="button" onClick={onImport} disabled={!canEdit}>
          <Icon.upload style={{ width: 13, height: 13 }} />
          엑셀 가져오기
        </button>
        <button className="btn sm primary" type="button" onClick={onAdd} disabled={!canEdit}>
          <Icon.plus style={{ width: 13, height: 13 }} />
          추가토핑 추가
        </button>
      </div>
    </div>
  );
}
