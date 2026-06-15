import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/icons';

const S_DOT_LABEL = { display: 'inline-flex', alignItems: 'center', gap: 8 };

/**
 * 원가계산 보고서 뷰 (viewTab === 'report').
 * 순수 렌더링 — 상태 없음, props만 사용.
 */
export function CostReportView({
  opts,
  catStats,
  totalCount,
  allAvg,
  allRisk,
  allMaxRate,
  riskThreshold,
  activeCats,
  riskMenus,
  diagnostics,
}) {
  return (
    <>
      {/* ── 요약 통계 ── */}
      {opts.summary && (
        <div className="paper-stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="paper-stat">
            <div className="paper-stat-label">대상 메뉴</div>
            <div className="paper-stat-val num">
              {totalCount > 0 ? formatNumber(totalCount) : '—'}
              <span className="unit">{totalCount > 0 ? '개' : ''}</span>
            </div>
            <div className="paper-stat-foot">{activeCats.length}개 카테고리</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">평균 원가율</div>
            <div className="paper-stat-val num">
              {allAvg > 0 ? allAvg.toFixed(1) : '—'}
              <span className="unit">{allAvg > 0 ? '%' : ''}</span>
            </div>
            <div className="paper-stat-foot">전 카테고리 가중평균</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">위험 메뉴</div>
            <div className="paper-stat-val num" style={{ color: 'var(--warn)' }}>
              {formatNumber(allRisk)}
            </div>
            <div className="paper-stat-foot">{riskThreshold}% 초과</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">최고 원가율</div>
            <div className="paper-stat-val num" style={{ color: 'var(--negative)' }}>
              {allMaxRate > 0 ? allMaxRate.toFixed(1) : '—'}
              <span className="unit">{allMaxRate > 0 ? '%' : ''}</span>
            </div>
            <div className="paper-stat-foot">단일 메뉴 기준</div>
          </div>
        </div>
      )}

      {/* ── 카테고리 종합 비교 ── */}
      {opts.catTable && (
        <div className="paper-section">
          <div className="paper-section-title">카테고리별 종합 비교</div>
          {catStats.some(c => c.count > 0) ? (
            <>
              <div className="cost-bars">
                {catStats
                  .filter(c => c.count > 0)
                  .map(c => (
                    <div key={c.id} className="cost-bar-row">
                      <div className="cost-bar-label">
                        <span className="dot" style={{ background: c.color }} />
                        <span>{c.label}</span>
                      </div>
                      <div className="cost-bar-track">
                        <div
                          className="cost-bar-fill"
                          style={{
                            width: `${Math.min((c.avg / 50) * 100, 100)}%`,
                            background: c.color,
                          }}
                        />
                        <div
                          className="cost-bar-threshold"
                          style={{ left: `${(riskThreshold / 50) * 100}%` }}
                          title={`위험 기준 ${riskThreshold}%`}
                        />
                      </div>
                      <div className="cost-bar-val num">
                        {c.avg > 0 ? (
                          <>
                            <b>
                              {c.avg.toFixed(1)}
                              <span className="unit">%</span>
                            </b>
                            <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>
                              ({c.min.toFixed(1)}~{c.max.toFixed(1)})
                            </span>
                          </>
                        ) : (
                          <span className="muted">원가 미등록</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              <table className="paper-table" style={{ marginTop: 14 }}>
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th style={{ width: 70, textAlign: 'right' }}>메뉴 수</th>
                    <th style={{ width: 90, textAlign: 'right' }}>평균 원가율</th>
                    <th style={{ width: 120, textAlign: 'right' }}>최저 ~ 최고</th>
                    <th style={{ width: 80, textAlign: 'right' }}>위험</th>
                  </tr>
                </thead>
                <tbody>
                  {catStats.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span
                            className="dot"
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: c.color,
                            }}
                          />
                          <b>{c.label}</b>
                        </span>
                      </td>
                      <td className="num right">{c.count}</td>
                      <td className="num right" style={{ fontWeight: 800 }}>
                        {c.avg > 0 ? `${c.avg.toFixed(1)}%` : '—'}
                      </td>
                      <td className="num right">
                        {c.avg > 0 ? `${c.min.toFixed(1)}% ~ ${c.max.toFixed(1)}%` : '—'}
                      </td>
                      <td className="num right">
                        {c.risk > 0 ? (
                          <span style={{ color: 'var(--warn)', fontWeight: 800 }}>
                            {c.risk}개 ⚠
                          </span>
                        ) : (
                          <span className="muted">0개</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td style={{ fontWeight: 800 }}>합계</td>
                    <td className="num right" style={{ fontWeight: 800 }}>
                      {totalCount}
                    </td>
                    <td className="num right" style={{ fontWeight: 800 }}>
                      {allAvg > 0 ? `${allAvg.toFixed(1)}%` : '—'}
                    </td>
                    <td className="num right muted">—</td>
                    <td className="num right" style={{ fontWeight: 800, color: 'var(--warn)' }}>
                      {allRisk}개
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
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
              원가계산 → 판매가 등록 후 표시돼요
            </div>
          )}
        </div>
      )}

      {/* ── 카테고리별 메뉴 전체 ── */}
      {opts.perCategory &&
        catStats
          .filter(c => c.count > 0)
          .map(c => (
            <div className="paper-section paper-cat-section" key={c.id}>
              <div
                className="paper-section-title"
                style={{
                  borderBottomColor: c.color,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}
              >
                <span style={S_DOT_LABEL}>
                  <span
                    className="dot"
                    style={{ width: 10, height: 10, borderRadius: 3, background: c.color }}
                  />
                  {c.label} 종합 원가 (전체 {c.count}개)
                </span>
                <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>
                  평균{' '}
                  <b className="num" style={{ color: c.avg > 0 ? 'var(--text-1)' : undefined }}>
                    {c.avg > 0 ? `${c.avg.toFixed(1)}%` : '—'}
                  </b>
                  {' · '}위험 {c.risk}개
                </span>
              </div>
              <table className="paper-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>메뉴명</th>
                    <th style={{ width: 90, textAlign: 'right' }}>판매가</th>
                    <th style={{ width: 90, textAlign: 'right' }}>원가</th>
                    <th style={{ width: 80, textAlign: 'right' }}>원가율</th>
                  </tr>
                </thead>
                <tbody>
                  {c.menus.map((m, i) => {
                    const risk = m.rate >= riskThreshold;
                    return (
                      <tr key={m.code || m.name}>
                        <td className="num">{i + 1}</td>
                        <td>{m.name}</td>
                        <td className="num right muted">
                          {m.sale > 0 ? `${formatNumber(m.sale)}원` : '—'}
                        </td>
                        <td className="num right muted">
                          {m.cost > 0 ? `${formatNumber(m.cost)}원` : '—'}
                        </td>
                        <td
                          className="num right"
                          style={{
                            fontWeight: risk ? 800 : 600,
                            color: risk ? 'var(--warn)' : 'var(--text-1)',
                          }}
                        >
                          {m.rate > 0 ? `${m.rate.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

      {/* ── 위험 메뉴 부록 ── */}
      {opts.riskList && riskMenus.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title" style={{ borderBottomColor: 'var(--warn)' }}>
            <span style={S_DOT_LABEL}>
              <Icon.alert style={{ width: 14, height: 14, color: 'var(--warn)' }} />
              위험 메뉴 부록 (원가율 {riskThreshold}% 초과)
            </span>
          </div>
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>메뉴명</th>
                <th style={{ width: 90 }}>카테고리</th>
                <th style={{ width: 90, textAlign: 'right' }}>판매가</th>
                <th style={{ width: 90, textAlign: 'right' }}>원가율</th>
              </tr>
            </thead>
            <tbody>
              {riskMenus.map((m, i) => (
                <tr key={m.code || m.name}>
                  <td className="num">{i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{m.name}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="dot"
                        style={{ width: 6, height: 6, borderRadius: '50%', background: m.catColor }}
                      />
                      {m.catLabel}
                    </span>
                  </td>
                  <td className="num right muted">
                    {m.sale > 0 ? `${formatNumber(m.sale)}원` : '—'}
                  </td>
                  <td className="num right" style={{ fontWeight: 800, color: 'var(--warn)' }}>
                    {m.rate.toFixed(1)}% ⚠
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 원가 미연결 진단 ── */}
      {diagnostics.length > 0 && (
        <div className="paper-section" style={{ marginTop: 24 }}>
          <div
            className="paper-section-title"
            style={{ borderBottomColor: 'var(--text-3)', color: 'var(--text-2)' }}
          >
            원가 미연결 메뉴 ({diagnostics.length}개)
          </div>
          <table className="paper-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>메뉴명</th>
                <th style={{ width: 90 }}>카테고리</th>
                <th style={{ width: 100 }}>메뉴코드</th>
                <th style={{ width: 120 }}>원인</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((d, i) => (
                <tr key={`${d.code}-${i}`}>
                  <td>{d.name}</td>
                  <td className="muted">{d.catLabel}</td>
                  <td className="mono muted" style={{ fontSize: 11 }}>
                    {d.code}
                  </td>
                  <td style={{ color: 'var(--negative)', fontSize: 12, fontWeight: 600 }}>
                    {d.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
