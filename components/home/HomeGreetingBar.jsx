import { Icon } from '@/components/icons';

export function HomeGreetingBar({
  todayStr,
  greeting,
  userName,
  greetSub,
  favoritesCount,
  favOnly,
  onToggleFavOnly,
  refreshing,
  onRefresh,
  onOpenWidgetConfig,
  onUploadSales,
  onNewNote,
  canEdit = false,
}) {
  return (
    <div
      className="greet"
      style={{ animation: 'slide-up 340ms 0ms cubic-bezier(0.2,0.8,0.2,1) both' }}
    >
      <div>
        <div className="greet-meta">{todayStr}</div>
        <h1>
          {greeting}, <span className="accent">{userName}</span>님
        </h1>
        <div className="sub">{greetSub}</div>
      </div>
      <div className="right">
        {favoritesCount > 0 && (
          <button
            type="button"
            className="btn"
            title={favOnly ? '전체 위젯 보기' : '즐겨찾기 위젯만 보기'}
            aria-pressed={favOnly}
            onClick={onToggleFavOnly}
            style={
              favOnly
                ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                : undefined
            }
          >
            {favOnly ? (
              <Icon.starFill style={{ width: 15, height: 15 }} />
            ) : (
              <Icon.star style={{ width: 15, height: 15 }} />
            )}
            즐겨찾기만
          </button>
        )}
        <button
          type="button"
          className="btn"
          title="대시보드 새로고침"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <span
            style={{
              fontSize: 15,
              lineHeight: 1,
              display: 'inline-block',
              transform: 'rotate(45deg)',
            }}
          >
            ↻
          </span>
          {refreshing ? ' 갱신 중…' : ''}
        </button>
        <button type="button" className="btn" title="위젯 설정" onClick={onOpenWidgetConfig}>
          <Icon.gear style={{ width: 15, height: 15 }} />
        </button>
        <button type="button" className="btn" onClick={onUploadSales} disabled={!canEdit}>
          <Icon.upload style={{ width: 16, height: 16 }} /> 판매량 업로드
        </button>
        <button type="button" className="btn primary" onClick={onNewNote} disabled={!canEdit}>
          <Icon.plus style={{ width: 16, height: 16 }} /> 새 테스트 노트
        </button>
      </div>
    </div>
  );
}
