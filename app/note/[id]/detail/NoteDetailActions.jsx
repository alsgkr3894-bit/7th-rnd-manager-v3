import { COST_MARGIN_ROUTE, MENU_MASTER_ROUTE } from '@/lib/cost/routes';

const COST_LINKS = [
  { label: '식자재 단가', href: '/ingredient/manage?view=price' },
  { label: '메뉴 마스터', href: MENU_MASTER_ROUTE },
  { label: '원가마진표', href: COST_MARGIN_ROUTE },
];

// 취소/저장 버튼은 여기 없다 — 스크롤을 따라오는 하단 StickySaveBar
// (app/note/[id]/page.jsx)가 전담한다. 화면 어디서든 저장할 수 있게 하기 위한 분리.
export function NoteDetailActions({
  canEdit = false,
  duplicating,
  costMenuOpen,
  onPrint,
  onDuplicate,
  onToggleCostMenu,
  onCloseCostMenu,
  onNavigateCostLink,
  onCreateSample,
}) {
  return (
    <>
      <button className="btn no-print" onClick={onPrint} title="인쇄">
        🖨
      </button>
      <button
        className="btn no-print"
        onClick={onDuplicate}
        disabled={duplicating || !canEdit}
        title="이 노트 복사"
      >
        {duplicating ? '복사 중…' : '복사'}
      </button>
      <NoteCostMenu
        open={costMenuOpen}
        onToggle={onToggleCostMenu}
        onClose={onCloseCostMenu}
        onNavigate={onNavigateCostLink}
      />
      <button className="btn no-print" onClick={onCreateSample} disabled={!canEdit}>
        📷 샘플 작성
      </button>
    </>
  );
}

function NoteCostMenu({ open, onToggle, onClose, onNavigate }) {
  return (
    <div style={{ position: 'relative' }} className="no-print">
      <button className="btn" onClick={onToggle}>
        ↗ 원가
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={onClose} />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              zIndex: 100,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-md)',
              minWidth: 160,
              overflow: 'hidden',
            }}
          >
            {COST_LINKS.map(item => (
              <button
                key={item.href}
                className="btn"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 16px',
                  borderRadius: 0,
                  fontSize: 13,
                }}
                onClick={() => onNavigate(item.href)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
