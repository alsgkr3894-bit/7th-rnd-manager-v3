import { Icon } from '@/components/icons';

/** 세 설정 섹션(Aliases·Rules·Excluded)이 공유하는 스타일·컴포넌트 */

export const inputStyle = {
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text-1)', fontSize: 13,
};

export function SectionHeader({ title, count, adding, onAdd }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>
        {title} <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: 6 }}>{count}개</span>
      </div>
      <button className="btn sm" onClick={onAdd}>
        {adding ? '닫기' : <><Icon.plus style={{ width: 12, height: 12 }}/> 추가</>}
      </button>
    </div>
  );
}

export function SectionEmpty({ children }) {
  return (
    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
      {children}
    </div>
  );
}
