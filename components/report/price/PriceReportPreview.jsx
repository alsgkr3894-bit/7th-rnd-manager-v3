'use client';

import { formatNumber } from '@/lib/format';
import { useReportGeneratedMeta } from '@/hooks/useReportGeneratedMeta';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const STATUS_COLOR = {
  인상: 'var(--negative)',
  인하: 'var(--positive)',
  신규: 'var(--accent)',
  삭제: 'var(--text-4)',
};
const STATUS_MARK = { 인상: '▲', 인하: '▼', 신규: 'NEW', 삭제: 'DEL' };

function safeChangeRate(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

function safePrice(value) {
  return asFiniteNumber(value, null);
}

function safeCategory(value) {
  return asDisplayText(value, '기타') || '기타';
}

export function PriceReportPreview({ dateRange, changes, catSummary, opts }) {
  const safeChanges = asObjectArray(changes);
  const safeCatSummary = asObjectArray(catSummary);
  const rising = safeChanges.filter(change => change.changeStatus === '인상').length;
  const falling = safeChanges.filter(change => change.changeStatus === '인하').length;
  const newItem = safeChanges.filter(change => change.changeStatus === '신규').length;
  const delItem = safeChanges.filter(change => change.changeStatus === '삭제').length;
  const { compactDateLabel, profileName } = useReportGeneratedMeta();

  const catOrder = safeCatSummary.map(category => safeCategory(category.cat));
  const byCategory = {};
  for (const change of safeChanges) {
    const cat = safeCategory(change.temperature);
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(change);
  }
  const cats = [...new Set([...catOrder, ...Object.keys(byCategory)])].filter(
    cat => byCategory[cat]
  );

  return (
    <>
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · 제때 단가 관리</div>
        <h2 className="paper-title">제때 가격 변동 보고서</h2>
        <div className="paper-meta">
          <span>기간: {dateRange}</span>
          <span>·</span>
          <span className="mono">
            생성일 {compactDateLabel} · {profileName}
          </span>
        </div>
      </div>

      <div className="paper-stat-row">
        <div className="paper-stat">
          <div className="paper-stat-label">인상</div>
          <div
            className="paper-stat-val num"
            style={{ color: rising > 0 ? 'var(--negative)' : undefined }}
          >
            {rising}
          </div>
        </div>
        <div className="paper-stat">
          <div className="paper-stat-label">인하</div>
          <div
            className="paper-stat-val num"
            style={{ color: falling > 0 ? 'var(--positive)' : undefined }}
          >
            {falling}
          </div>
        </div>
        <div className="paper-stat">
          <div className="paper-stat-label">신규</div>
          <div
            className="paper-stat-val num"
            style={{ color: newItem > 0 ? 'var(--accent)' : undefined }}
          >
            {newItem}
          </div>
        </div>
        <div className="paper-stat">
          <div className="paper-stat-label">삭제</div>
          <div className="paper-stat-val num">{delItem}</div>
        </div>
        <div className="paper-stat">
          <div className="paper-stat-label">총 변동</div>
          <div className="paper-stat-val num">{safeChanges.length}</div>
        </div>
      </div>

      {opts.catSummary && safeCatSummary.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">전체 식자재 변동 요약</div>
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{ width: 70, textAlign: 'right' }}>총 변동</th>
                <th style={{ width: 60, textAlign: 'right' }}>인상</th>
                <th style={{ width: 60, textAlign: 'right' }}>인하</th>
                <th style={{ width: 50, textAlign: 'right' }}>신규</th>
                <th style={{ width: 50, textAlign: 'right' }}>삭제</th>
                <th style={{ width: 90, textAlign: 'right' }}>평균 변동률</th>
              </tr>
            </thead>
            <tbody>
              {safeCatSummary.map((category, index) => {
                const count = asFiniteNumber(category.count, 0) ?? 0;
                const sum = asFiniteNumber(category.sum, 0) ?? 0;
                return (
                  <tr key={`cat-summary-${index}`}>
                    <td className="num right">{asFiniteNumber(category.total, 0) ?? 0}</td>
                    <td className="num right" style={{ color: 'var(--negative)' }}>
                      {asFiniteNumber(category.up, 0) || '—'}
                    </td>
                    <td className="num right" style={{ color: 'var(--positive)' }}>
                      {asFiniteNumber(category.down, 0) || '—'}
                    </td>
                    <td className="num right" style={{ color: 'var(--accent)' }}>
                      {asFiniteNumber(category.newItem, 0) || '—'}
                    </td>
                    <td className="num right muted">{asFiniteNumber(category.del, 0) || '—'}</td>
                    <td className="num right">
                      {count > 0 ? `${(sum / count).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {opts.costImpact && safeChanges.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">원가 영향 식자재</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
            <span>
              인상 <b style={{ color: 'var(--negative)' }}>{rising}건</b>
            </span>
            <span>
              인하 <b style={{ color: 'var(--positive)' }}>{falling}건</b>
            </span>
            <span>
              신규 <b style={{ color: 'var(--accent)' }}>{newItem}건</b>
            </span>
            <span>
              삭제 <b style={{ color: 'var(--text-3)' }}>{delItem}건</b>
            </span>
          </div>
        </div>
      )}

      {safeChanges.length > 0 ? (
        cats.map(cat => {
          const rows = asObjectArray(byCategory[cat]);
          return (
            <div className="paper-section paper-cat-section" key={cat}>
              <div className="paper-section-title">{cat} — 변동 품목</div>
              <table className="paper-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>코드</th>
                    <th>제품명</th>
                    <th style={{ width: 90, textAlign: 'right' }}>이전 단가</th>
                    <th style={{ width: 90, textAlign: 'right' }}>현재 단가</th>
                    <th style={{ width: 90, textAlign: 'right' }}>변동</th>
                    <th style={{ width: 80, textAlign: 'right' }}>변동률</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((change, index) => {
                    const pct = safeChangeRate(change.changeRate) * 100;
                    const status = asDisplayText(change.changeStatus);
                    const isSpecial = status === '신규' || status === '삭제';
                    const productCode = asDisplayText(change.productCode);
                    const productName = asDisplayText(change.productName, '—');
                    const basePrice = safePrice(change.basePrice);
                    const latestPrice = safePrice(change.latestPrice);
                    const changeAmount =
                      latestPrice != null && basePrice != null ? latestPrice - basePrice : null;
                    return (
                      <tr key={`${productCode || productName}-${index}`}>
                        <td className="muted mono" style={{ fontSize: 11 }}>
                          {productCode || '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{productName}</td>
                        <td className="num right muted">
                          {basePrice != null ? formatNumber(basePrice) : '—'}
                        </td>
                        <td className="num right" style={{ fontWeight: 700 }}>
                          {latestPrice != null
                            ? formatNumber(latestPrice)
                            : status === '신규'
                              ? '신규'
                              : '—'}
                        </td>
                        <td className="num right" style={{ color: STATUS_COLOR[status] }}>
                          {isSpecial || changeAmount == null
                            ? '—'
                            : `${changeAmount > 0 ? '+' : ''}${formatNumber(changeAmount)}`}
                        </td>
                        <td
                          className="num right"
                          style={{ fontWeight: 700, color: STATUS_COLOR[status] }}
                        >
                          {isSpecial
                            ? STATUS_MARK[status]
                            : `${STATUS_MARK[status] || ''} ${Math.abs(pct).toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })
      ) : (
        <div
          style={{
            height: 60,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--text-4)',
            fontSize: 13,
          }}
        >
          {dateRange === '—' ? '가격 파일 2개 이상 업로드 후 비교할 수 있어요' : '변동 품목 없음'}
        </div>
      )}

      <div className="paper-foot">
        <span className="muted" style={{ fontSize: 11 }}>
          7번가 R&amp;D 플랫폼
        </span>
      </div>
    </>
  );
}
