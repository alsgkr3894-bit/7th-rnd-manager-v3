'use client';
import { formatNumber } from '@/lib/format';
import { getCostRateStyles } from '@/lib/cost/rate-color';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

export function CostAlertWidget({ data, router }) {
  const items = asObjectArray(data?.items).map(item => ({
    ...item,
    costRate: asFiniteNumber(item.costRate, 0),
  }));
  if (items.length === 0) return null;

  const allAlerts = items.filter(item => item.costRate > 40);
  const alerts = allAlerts.slice(0, 5);
  const caution = items.filter(item => item.costRate > 30 && item.costRate <= 40).length;
  const good = items.filter(item => item.costRate <= 30).length;
  const total = asFiniteNumber(data?.total, items.length);
  const goMargin = () => router?.push?.('/cost/margin');

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">원가율 경보</div>
          <div className="card-sub">
            레시피 등록 {total}개 ·{' '}
            <span style={{ color: 'var(--negative)', fontWeight: 700 }}>
              경보 {alerts.length}개
            </span>
            {caution > 0 && <span style={{ color: 'var(--warn)' }}> · 주의 {caution}개</span>}
            {good > 0 && <span style={{ color: 'var(--positive)' }}> · 양호 {good}개</span>}
          </div>
        </div>
        <button className="link accent" onClick={goMargin}>
          전체 →
        </button>
      </div>

      <div className="alert-summary">
        <div className="alert-pill bad">
          <div className="n">{alerts.length}</div>
          <div className="t">경보 · 40%↑</div>
        </div>
        <div className="alert-pill warn">
          <div className="n">{caution}</div>
          <div className="t">주의 · 30–40%</div>
        </div>
        <div className="alert-pill good">
          <div className="n">{good}</div>
          <div className="t">양호 · 30%↓</div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px' }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--positive)' }}>
              경보 메뉴 없음
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>모든 메뉴 원가율 40% 이하</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {alerts.map((item, index) => {
            const styles = getCostRateStyles(item.costRate);
            const menuName = asDisplayText(item.menuName, '메뉴명 없음');
            const size = asDisplayText(item.size);
            return (
              <button
                key={index}
                className="widget-row"
                onClick={goMargin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  width: '100%',
                  borderLeft: `3px solid ${styles.text}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    title={menuName}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-1)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {menuName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {size} · 원가 {formatNumber(item.cost)}원 / 판매가{' '}
                    {formatNumber(item.sellingPrice)}원
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: styles.text,
                    background: styles.bg,
                    padding: '3px 9px',
                    borderRadius: 99,
                    flexShrink: 0,
                  }}
                >
                  {item.costRate.toFixed(1)}%
                </span>
              </button>
            );
          })}
          {allAlerts.length > 5 && (
            <div
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text-3)',
                padding: '4px 0',
              }}
            >
              외 {allAlerts.length - 5}개
            </div>
          )}
        </div>
      )}
    </div>
  );
}
