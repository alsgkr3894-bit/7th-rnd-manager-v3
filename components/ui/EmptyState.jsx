'use client';

/**
 * EmptyState — 데이터가 없을 때 표시하는 공통 빈 상태 안내.
 *
 * 카드/리스트 내부 등 좁은 영역에서 쓰는 컴포넌트형 빈 상태의 정식(canonical) 위치.
 * (페이지 전체 빈 상태는 `.empty-state` CSS 클래스를 쓰는 div 패턴도 병행 사용)
 *
 * @param {React.ReactNode} [props.icon]    - 상단 아이콘
 * @param {string}          props.title      - 제목 (필수)
 * @param {string}          [props.desc]     - 보조 설명
 * @param {string}          [props.action]   - 액션 버튼 라벨
 * @param {Function}        [props.onAction] - 액션 버튼 클릭 핸들러
 * @param {boolean}         [props.compact]  - 좁은 영역용 축소 패딩
 */
export function EmptyState({ icon, title, desc, action, onAction, compact }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: compact ? '32px 16px' : '48px 24px',
      color: 'var(--text-3)', textAlign: 'center', gap: 8,
    }}>
      {icon && <div style={{ color: 'var(--text-4)' }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{title}</div>
      {desc && <div style={{ fontSize: 12 }}>{desc}</div>}
      {action && (
        <button className="btn primary sm" onClick={onAction} style={{ marginTop: 8 }}>
          {action}
        </button>
      )}
    </div>
  );
}
