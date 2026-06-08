'use client';
import { useState, useEffect } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { formatNumber } from '@/lib/format';
import { initDB } from '@/lib/db/init';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price/store';
import { comparePriceLists } from '@/lib/price/compare';
import { useDraftRestore } from '@/hooks/useDraftRestore';
import { getProfile } from '@/lib/profile';

const DRAFT_KEY = 'report_draft_price';

const STATUS_COLOR = {
  인상: 'var(--negative)',
  인하: 'var(--positive)',
  신규: 'var(--accent)',
  삭제: 'var(--text-4)',
};
const STATUS_MARK = { 인상: '▲', 인하: '▼', 신규: 'NEW', 삭제: 'DEL' };

export default function Page() {
  const [periodMode, setPeriodMode] = useState('week');
  const [threshold, setThreshold] = useState(3);
  const [opts, setOpts] = useState({
    catSummary: true,
    costImpact: true,
  });
  const upd = makeFieldUpdater(setOpts);
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = makeFieldUpdater(setDocFormat);

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [customFrom, setCustomFrom] = useState(weekAgoStr);
  const [customTo, setCustomTo] = useState(todayStr);

  const [changes, setChanges] = useState([]);
  const [catSummary, setCatSummary] = useState([]);
  const [dateRange, setDateRange] = useState('—');
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.periodMode) setPeriodMode(draft.periodMode);
    if (draft.threshold != null) setThreshold(draft.threshold);
    if (draft.opts) setOpts(o => ({ ...o, ...draft.opts }));
  });

  useEffect(() => {
    setIsLoading(true);
    initDB()
      .then(async () => {
        try {
          const files = await getPriceFiles();
          if (files.length < 2) {
            setIsLoading(false);
            return;
          }
          const sorted = [...files].sort((a, b) => (a.updateDate > b.updateDate ? -1 : 1));

          let base, latest;
          if (periodMode === 'custom') {
            const toFiles = sorted.filter(f => f.updateDate <= customTo);
            const fromFiles = sorted.filter(f => f.updateDate <= customFrom);
            latest = toFiles[0];
            base = fromFiles.find(f => f.id !== latest?.id) || sorted[1];
            if (!latest || !base || latest.id === base.id) {
              setIsLoading(false);
              return;
            }
          } else {
            [latest, base] = sorted;
          }
          setDateRange(`${base.updateDate} ~ ${latest.updateDate}`);

          const [latestRows, baseRows] = await Promise.all([
            getPriceRowsByFileId(latest.id),
            getPriceRowsByFileId(base.id),
          ]);
          const diff = comparePriceLists(baseRows, latestRows).filter(
            c => c.changeStatus !== '변동없음'
          );
          const filtered = diff.filter(c => {
            if (c.changeStatus === '신규' || c.changeStatus === '삭제') return true;
            return Math.abs((c.changeRate || 0) * 100) >= threshold;
          });
          setChanges(filtered);

          const catMap = new Map();
          for (const c of filtered) {
            const cat = c.temperature || '기타';
            const entry = catMap.get(cat) || {
              cat,
              total: 0,
              up: 0,
              down: 0,
              newItem: 0,
              del: 0,
              sum: 0,
              count: 0,
            };
            entry.total++;
            const pct = Math.abs((c.changeRate || 0) * 100);
            if (c.changeStatus === '인상') {
              entry.up++;
              entry.sum += pct;
              entry.count++;
            }
            if (c.changeStatus === '인하') {
              entry.down++;
              entry.sum += pct;
              entry.count++;
            }
            if (c.changeStatus === '신규') {
              entry.newItem++;
            }
            if (c.changeStatus === '삭제') {
              entry.del++;
            }
            catMap.set(cat, entry);
          }
          setCatSummary(Array.from(catMap.values()));
          setDataError(null);
        } catch (err) {
          console.error('[price report]', err);
          setDataError('가격 파일을 비교하는 중 오류가 발생했어요.');
        } finally {
          setIsLoading(false);
        }
      })
      .catch(() => {
        setIsLoading(false);
        setDataError('데이터베이스에 연결할 수 없어요. 가격 파일을 먼저 업로드해 주세요.');
      });
  }, [threshold, periodMode, customFrom, customTo]);

  const rising = changes.filter(c => c.changeStatus === '인상').length;
  const falling = changes.filter(c => c.changeStatus === '인하').length;
  const newItem = changes.filter(c => c.changeStatus === '신규').length;
  const delItem = changes.filter(c => c.changeStatus === '삭제').length;

  const todayLabel = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
  const reportMeta = {
    kind: 'price',
    period: dateRange,
    name: `제때 가격 변동 보고서 (${dateRange})`,
    options: { periodMode, threshold, opts },
  };

  // 카테고리별로 그룹핑 (미리보기 + PDF용)
  const catOrder = catSummary.map(c => c.cat);
  const byCategory = {};
  for (const c of changes) {
    const cat = c.temperature || '기타';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(c);
  }
  const cats = [...new Set([...catOrder, ...Object.keys(byCategory)])].filter(c => byCategory[c]);

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '제때 가격 보고서']}
      title="제때 가격 보고서 생성"
      sub="제때 단가 변동 — 임계값을 넘는 품목만 자동 추출돼요."
      kind="price"
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      docFormat={docFormat}
      options={
        <>
          <OptGroup label="대상 기간">
            <Seg
              value={periodMode}
              onChange={setPeriodMode}
              options={[
                { value: 'week', label: '이번 주' },
                { value: 'month', label: '이번 달' },
                { value: 'custom', label: '사용자 지정' },
              ]}
            />
            {periodMode === 'custom' && (
              <div className="opt-period-row" style={{ marginTop: 8 }}>
                <input
                  type="date"
                  className="input"
                  value={customFrom}
                  max={customTo}
                  onChange={e => setCustomFrom(e.target.value)}
                />
                <span style={{ color: 'var(--text-3)' }}>~</span>
                <input
                  type="date"
                  className="input"
                  value={customTo}
                  min={customFrom}
                  onChange={e => setCustomTo(e.target.value)}
                />
              </div>
            )}
          </OptGroup>

          <OptGroup label="변동률 임계값" hint="이 비율 이상 변동된 품목만 포함">
            <div className="threshold-bar">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
              />
              <div className="threshold-val num" style={{ minWidth: 64 }}>
                ±{threshold}
                <span className="unit">%</span>
              </div>
            </div>
          </OptGroup>

          <OptGroup label="포함 섹션">
            <Check
              label="카테고리별 변동 요약"
              value={opts.catSummary}
              onChange={v => upd('catSummary', v)}
            />
            <Check
              label="원가 영향 메뉴 수"
              value={opts.costImpact}
              onChange={v => upd('costImpact', v)}
            />
          </OptGroup>

          <OptGroup label="문서 형식">
            <Check label="PDF" value={docFormat.pdf} onChange={v => updFmt('pdf', v)} />
            <Check label="Excel" value={docFormat.excel} onChange={v => updFmt('excel', v)} />
          </OptGroup>
        </>
      }
      preview={
        <>
          {/* ── 헤더 ── */}
          <div className="paper-head">
            <div className="paper-eyebrow">7번가피자 본사 · 제때 단가 관리</div>
            <h2 className="paper-title">제때 가격 변동 보고서</h2>
            <div className="paper-meta">
              <span>기간: {dateRange}</span>
              <span>·</span>
              <span>임계값 ±{threshold}%</span>
              <span>·</span>
              <span className="mono">
                생성일 {todayLabel} · {getProfile().name}
              </span>
            </div>
          </div>

          {/* ── 요약 통계 ── */}
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
              <div className="paper-stat-val num">{changes.length}</div>
            </div>
          </div>

          {/* ── 카테고리별 요약 ── */}
          {opts.catSummary && catSummary.length > 0 && (
            <div className="paper-section">
              <div className="paper-section-title">카테고리별 변동 요약</div>
              <table className="paper-table">
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th style={{ width: 70, textAlign: 'right' }}>총 변동</th>
                    <th style={{ width: 60, textAlign: 'right' }}>인상</th>
                    <th style={{ width: 60, textAlign: 'right' }}>인하</th>
                    <th style={{ width: 50, textAlign: 'right' }}>신규</th>
                    <th style={{ width: 50, textAlign: 'right' }}>삭제</th>
                    <th style={{ width: 90, textAlign: 'right' }}>평균 변동률</th>
                  </tr>
                </thead>
                <tbody>
                  {catSummary.map(c => (
                    <tr key={c.cat}>
                      <td style={{ fontWeight: 600 }}>{c.cat}</td>
                      <td className="num right">{c.total}</td>
                      <td className="num right" style={{ color: 'var(--negative)' }}>
                        {c.up || '—'}
                      </td>
                      <td className="num right" style={{ color: 'var(--positive)' }}>
                        {c.down || '—'}
                      </td>
                      <td className="num right" style={{ color: 'var(--accent)' }}>
                        {c.newItem || '—'}
                      </td>
                      <td className="num right muted">{c.del || '—'}</td>
                      <td className="num right">
                        {c.count > 0 ? `${(c.sum / c.count).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 카테고리별 변동 품목 상세 ── */}
          {changes.length > 0 ? (
            cats.map(cat => (
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
                    {byCategory[cat].map((c, ci) => {
                      const pct = (c.changeRate || 0) * 100;
                      const isSpecial = c.changeStatus === '신규' || c.changeStatus === '삭제';
                      return (
                        <tr key={`${c.productCode || c.productName}-${ci}`}>
                          <td className="muted mono" style={{ fontSize: 11 }}>
                            {c.productCode || '—'}
                          </td>
                          <td style={{ fontWeight: 600 }}>{c.productName}</td>
                          <td className="num right muted">
                            {c.basePrice != null ? formatNumber(c.basePrice) : '—'}
                          </td>
                          <td className="num right" style={{ fontWeight: 700 }}>
                            {c.latestPrice != null
                              ? formatNumber(c.latestPrice)
                              : c.changeStatus === '신규'
                                ? '신규'
                                : '—'}
                          </td>
                          <td className="num right" style={{ color: STATUS_COLOR[c.changeStatus] }}>
                            {isSpecial
                              ? '—'
                              : `${c.latestPrice - c.basePrice > 0 ? '+' : ''}${formatNumber(c.latestPrice - c.basePrice)}`}
                          </td>
                          <td
                            className="num right"
                            style={{ fontWeight: 700, color: STATUS_COLOR[c.changeStatus] }}
                          >
                            {isSpecial
                              ? STATUS_MARK[c.changeStatus]
                              : `${STATUS_MARK[c.changeStatus]} ${Math.abs(pct).toFixed(1)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
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
              {dateRange === '—'
                ? '가격 파일 2개 이상 업로드 후 비교할 수 있어요'
                : `임계값 ±${threshold}% 이상 변동 품목 없음`}
            </div>
          )}

          <div className="paper-foot">
            <span className="muted" style={{ fontSize: 11 }}>
              7번가 R&amp;D 플랫폼
            </span>
          </div>
        </>
      }
    />
  );
}
