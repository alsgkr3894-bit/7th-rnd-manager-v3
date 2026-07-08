import { Icon } from '@/components/icons';
import { Stars } from '../_Stars';

export function SampleDetailHeader({
  model,
  onOpenMenuMaster,
  onEdit,
  onNextRound,
  onDelete,
  onClose,
  canEdit = false,
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '16px 20px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      <div>
        <SampleDetailBadges category={model.category} rating={model.rating} />
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>{model.title}</div>
        <SampleDetailMeta model={model} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
        <button
          className="btn sm"
          title="메뉴마스터로 이동"
          onClick={onOpenMenuMaster}
          style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Icon.plus style={{ width: 11, height: 11 }} /> 메뉴 마스터
        </button>
        <button className="btn sm" onClick={onEdit} disabled={!canEdit}>
          수정
        </button>
        <button className="btn sm" onClick={onNextRound} disabled={!canEdit}>
          다음 차수
        </button>
        <button
          className="btn sm"
          style={{ color: 'var(--negative)' }}
          onClick={onDelete}
          disabled={!canEdit}
        >
          삭제
        </button>
        <button
          aria-label="닫기"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-3)',
            padding: 4,
          }}
          onClick={onClose}
        >
          <Icon.close aria-hidden="true" style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </div>
  );
}

function SampleDetailBadges({ category, rating }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 4,
      }}
    >
      {category && (
        <span
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-text)',
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 6,
            fontWeight: 700,
          }}
        >
          {category}
        </span>
      )}
      {rating > 0 && <Stars value={rating} />}
    </div>
  );
}

function SampleDetailMeta({ model }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: 'var(--text-3)',
        marginTop: 2,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px 10px',
      }}
    >
      {model.recordType && <span style={{ fontWeight: 800 }}>{model.recordType}</span>}
      {model.ingredientGroupName && (
        <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{model.ingredientGroupName}</span>
      )}
      {model.names && (
        <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{model.names}</span>
      )}
      {model.testDate && <span>{model.testDate}</span>}
      {model.roundLabel && <span>{model.roundLabel}</span>}
      {model.isChained && <span>차수 연결</span>}
      {model.company && <span>{model.company}</span>}
      {model.tester && <span>담당: {model.tester}</span>}
      {model.priceLabel && <span>{model.priceLabel}</span>}
    </div>
  );
}
