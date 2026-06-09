'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * 미매칭 메뉴 처리 — 미매칭 이슈 트리아지 카드.
 *
 * 실제 해결(alias/rule/exclude)은 되돌릴 수 없는 트랜잭션이라 홈에서 인라인 확정 대신
 * 전용 페이지(/menu-sales/unmatched)로 연결한다. 여기선 현황 요약만 보여준다.
 *
 * @param {{ issues: Array, router }} props — issues = 전체 이슈(open + resolved)
 */
export function UnmatchedWidget({ issues = [], router }) {
  const safeIssues = asObjectArray(issues);
  if (!safeIssues.length) return null;

  const open = safeIssues.filter(i => i.status === 'open');
  const resolvedCount = safeIssues.length - open.length;
  const rate = safeIssues.length > 0 ? Math.round((resolvedCount / safeIssues.length) * 100) : 100;
  const go = () => router?.push?.('/menu-sales/unmatched');

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <div className="card-title">미매칭 메뉴 처리</div>
          <div className="card-sub">마스터와 매칭되지 않은 메뉴명</div>
        </div>
        <button className="link accent" onClick={go}>
          전체 <Icon.chevRight />
        </button>
      </div>

      <div className="unmatch-top">
        <div className="unmatch-num">{open.length}<span>건</span></div>
        <div className="unmatch-desc">판매 데이터의 메뉴명이 마스터와 매칭되지 않아 통계에서 누락될 수 있어요.</div>
      </div>

      <div>
        {open.slice(0, 4).map((i, index) => {
          const quantity = Number(i.totalQuantity);
          const rawName = asDisplayText(i.representativeRawMenuName || i.normalizedMenuName, '(미상)');
          const suggestedName = asDisplayText(i.normalizedMenuName, '확인 필요');
          return (
          <button key={i.id ?? index} className="unmatch-row" onClick={go} style={{ width: '100%', border: 0, cursor: 'pointer' }}>
            <span className="um-raw">{rawName}</span>
            <Icon.chevRight className="um-arrow" style={{ width: 13, height: 13 }} />
            <span className="um-sug">추정 <b>{suggestedName}</b></span>
            {quantity > 0 && <span className="um-tag">{formatNumber(quantity)}개</span>}
          </button>
          );
        })}
      </div>

      <div className="mini-foot">
        <div className="mf-top">
          <span>이슈 처리 현황</span>
          <b style={{ color: 'var(--positive)' }}>{rate}%</b>
        </div>
        <div className="mini-bar"><div style={{ width: `${rate}%`, background: 'var(--positive)' }} /></div>
        <div className="mf-sub">전체 {safeIssues.length}건 중 {resolvedCount}건 처리 · {open.length}건 매칭 필요</div>
      </div>

      <button className="btn primary" style={{ width: '100%', marginTop: 14 }} onClick={go}>지금 매칭하기</button>
    </div>
  );
}
