'use client';
import {
  getEmptyStateActionStyle,
  getEmptyStateContainerStyle,
  getEmptyStateDescriptionStyle,
  getEmptyStateIconStyle,
  getEmptyStateTitleStyle,
  normalizeEmptyStateAction,
  normalizeEmptyStateDescription,
  normalizeEmptyStateOnAction,
  normalizeEmptyStateText,
} from '@/lib/ui/empty-state';

/**
 * EmptyState — 데이터가 없을 때 표시하는 공통 빈 상태 안내.
 *
 * 카드/리스트 내부 등 좁은 영역에서 쓰는 컴포넌트형 빈 상태의 정식(canonical) 위치.
 * (페이지 전체 빈 상태는 `.empty-state` CSS 클래스를 쓰는 div 패턴도 병행 사용)
 *
 * @param {React.ReactNode} [props.icon]    - 상단 아이콘
 * @param {string}          props.title      - 제목 (필수)
 * @param {string}          [props.desc]     - 보조 설명
 * @param {string}          [props.sub]      - desc 호환용 보조 설명
 * @param {string}          [props.action]   - 액션 버튼 라벨
 * @param {Function}        [props.onAction] - 액션 버튼 클릭 핸들러
 * @param {boolean}         [props.compact]  - 좁은 영역용 축소 패딩
 */
export function EmptyState({ icon, title, desc, sub, action, onAction, compact }) {
  const actionClick = normalizeEmptyStateOnAction(onAction);
  const safeTitle = normalizeEmptyStateText(title);
  const safeDesc = normalizeEmptyStateDescription(desc, sub);
  const safeAction = normalizeEmptyStateAction(action);

  return (
    <div style={getEmptyStateContainerStyle(compact)}>
      {icon && <div style={getEmptyStateIconStyle()}>{icon}</div>}
      <div style={getEmptyStateTitleStyle()}>{safeTitle}</div>
      {safeDesc && <div style={getEmptyStateDescriptionStyle()}>{safeDesc}</div>}
      {safeAction && (
        <button className="btn primary sm" onClick={actionClick} style={getEmptyStateActionStyle()}>
          {safeAction}
        </button>
      )}
    </div>
  );
}
