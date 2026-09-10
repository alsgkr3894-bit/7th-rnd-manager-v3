'use client';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function formatCost(value) {
  return Number.isFinite(value) ? `${Math.round(value).toLocaleString()}원` : '—';
}

function formatPct(value) {
  return Number.isFinite(value) ? `${Math.abs(value).toFixed(1)}%` : '—';
}

function formatDate(value) {
  const s = String(value || '');
  return s ? s.slice(5).replace('-', '/') : '';
}

/**
 * 원가 변동한 메뉴 — 최근 단가파일 2건(직전·최신) 기준으로 레시피 원가를 재계산해
 * 변동폭이 큰 메뉴를 보여준다. 레시피 수정으로 인한 변동은 포함하지 않는다
 * (menu_recipe_versions 이력 비교는 메뉴마스터 수정 화면의 "변경 이력"에서 확인).
 *
 * @param {{ data: {items, baseDate, targetDate, total, reason} | null, router }} props
 */
export function MenuCostChangeWidget({ data, router }) {
  const items = asObjectArray(data?.items).slice(0, 5);
  const noBaseline = data?.reason === 'NO_BASELINE';

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">원가 변동한 메뉴</div>
          <div className="card-sub">
            {data?.baseDate && data?.targetDate
              ? `${formatDate(data.baseDate)} → ${formatDate(data.targetDate)} 단가 기준 · ${data.total}개`
              : '제때 단가 기준 원가 변동'}
          </div>
        </div>
        <button className="link accent" onClick={() => router?.push?.('/cost/margin')}>
          전체 <Icon.chevRight />
        </button>
      </div>

      {noBaseline ? (
        <EmptyState
          icon={<Icon.tag style={{ width: 28, height: 28 }} />}
          title="비교할 이전 단가파일이 없어요"
          desc="단가파일이 1개뿐이라 비교할 이전 시점이 없습니다. 다음 업로드부터 표시됩니다."
          compact
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Icon.tag style={{ width: 28, height: 28 }} />}
          title="원가 변동이 없어요"
          desc="단가 변경으로 원가가 바뀐 메뉴가 없습니다"
          compact
        />
      ) : (
        <div>
          {items.map((it, i) => {
            const up = Number(it.costDeltaPct) >= 0;
            return (
              <div key={it.menuCode || i} className="price-row">
                <div className="pr-meta">
                  <span className="pr-name" title={asDisplayText(it.menuName)}>
                    {asDisplayText(it.menuName)}
                  </span>
                  <span className="pr-sub">
                    {formatCost(it.beforeCost)} → {formatCost(it.afterCost)}
                  </span>
                </div>
                <span className={`price-chip ${up ? 'up' : 'down'}`}>
                  {up ? '▲' : '▼'} {formatPct(it.costDeltaPct)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
