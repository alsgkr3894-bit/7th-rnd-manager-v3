'use client';

import { KIND_COLOR } from '@/lib/report/constants';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { ReportPreviewOptionRow } from './ReportPreviewOptionRow';
import { asPlainObject } from './reportPreviewPageUtils';

const REPORT_OPTION_RENDERERS = {
  sales: (opts, subOpts, topN) => (
    <>
      <ReportPreviewOptionRow
        label="집계 기간"
        value={opts.periodMode === 'year' ? '년 단위' : '월 단위'}
      />
      <ReportPreviewOptionRow
        label="대상 범위"
        value={opts.scope === 'all' ? '전체 메뉴' : opts.scope}
      />
      <ReportPreviewOptionRow label="순위 깊이" value={topN} />
      {Object.keys(subOpts).length > 0 && (
        <>
          <ReportPreviewOptionRow
            label="카테고리 비중"
            value={subOpts.catShare ? '포함' : '제외'}
          />
          <ReportPreviewOptionRow label="메뉴 순위표" value={subOpts.rankTable ? '포함' : '제외'} />
          <ReportPreviewOptionRow label="전월 대비" value={subOpts.prevComp ? '포함' : '제외'} />
        </>
      )}
    </>
  ),
  price: (opts, subOpts) => (
    <>
      <ReportPreviewOptionRow
        label="변동률 임계값"
        value={`±${asDisplayText(opts.threshold, '3')}%`}
      />
      <ReportPreviewOptionRow
        label="기간 모드"
        value={
          opts.periodMode === 'week'
            ? '이번 주'
            : opts.periodMode === 'month'
              ? '이번 달'
              : '사용자 지정'
        }
      />
      {Object.keys(subOpts).length > 0 && (
        <>
          <ReportPreviewOptionRow label="스파크라인" value={subOpts.history7 ? '포함' : '제외'} />
          <ReportPreviewOptionRow label="원가 영향" value={subOpts.costImpact ? '포함' : '제외'} />
        </>
      )}
    </>
  ),
  shipment: (opts, subOpts) => (
    <>
      <ReportPreviewOptionRow
        label="집계 단위"
        value={
          opts.periodMode === 'week'
            ? '주 단위'
            : opts.periodMode === 'quart'
              ? '분기 단위'
              : '월 단위'
        }
      />
      <ReportPreviewOptionRow
        label="대상 분류"
        value={opts.type === 'managed' ? '관리품목' : opts.type === 'common' ? '범용상품' : '전체'}
      />
      {Object.keys(subOpts).length > 0 && (
        <>
          <ReportPreviewOptionRow label="추이 차트" value={subOpts.chart ? '포함' : '제외'} />
          <ReportPreviewOptionRow label="TOP 10 목록" value={subOpts.topList ? '포함' : '제외'} />
        </>
      )}
    </>
  ),
  compare: (opts, subOpts) => (
    <>
      <ReportPreviewOptionRow
        label="비교 모드"
        value={
          opts.mode === 'mom' ? '전월 대비' : opts.mode === 'yoy' ? '전년 동월' : '사용자 지정'
        }
      />
      <ReportPreviewOptionRow
        label="기간 A"
        value={
          opts.yearA && opts.monthA
            ? `${asDisplayText(opts.yearA)}년 ${asDisplayText(opts.monthA)}월`
            : '—'
        }
      />
      <ReportPreviewOptionRow
        label="대상 범위"
        value={opts.scope === 'all' ? '전체' : opts.scope === 'pizza' ? '피자' : '사이드'}
      />
      {Object.keys(subOpts).length > 0 && (
        <>
          <ReportPreviewOptionRow label="순위 이동표" value={subOpts.rankShift ? '포함' : '제외'} />
          <ReportPreviewOptionRow
            label="Winners/Losers"
            value={subOpts.winners ? '포함' : '제외'}
          />
        </>
      )}
    </>
  ),
  cost: (opts, subOpts) => {
    const cats = asPlainObject(opts.cats);
    const catLabel =
      Object.entries(cats)
        .filter(([, value]) => value)
        .map(([key]) =>
          key === 'pizza'
            ? '피자'
            : key === 'personal'
              ? '1인피자'
              : key === 'side'
                ? '사이드'
                : key === 'set'
                  ? '세트박스'
                  : '엣지&도우'
        )
        .join(', ') || '—';

    return (
      <>
        <ReportPreviewOptionRow
          label="집계 기간"
          value={opts.periodMode === 'year' ? '년 단위' : '월 단위'}
        />
        <ReportPreviewOptionRow
          label="위험 기준"
          value={`${asDisplayText(opts.riskThreshold, '35')}%↑`}
        />
        {Object.keys(cats).length > 0 && (
          <ReportPreviewOptionRow label="포함 카테고리" value={catLabel} />
        )}
        {Object.keys(subOpts).length > 0 && (
          <>
            <ReportPreviewOptionRow
              label="카테고리 비교표"
              value={subOpts.catTable ? '포함' : '제외'}
            />
            <ReportPreviewOptionRow
              label="위험 메뉴 부록"
              value={subOpts.riskList ? '포함' : '제외'}
            />
          </>
        )}
      </>
    );
  },
};

export function ReportOptionsPage({ report }) {
  const kind = asDisplayText(report.kind);
  const opts = asPlainObject(report.options);
  const subOpts = asPlainObject(opts.opts);
  const color = KIND_COLOR[kind] || '#888';
  const topNText = asDisplayText(opts.topN);
  const topN = opts.topN === 50 ? '전체' : topNText ? `TOP ${topNText}` : '—';
  const renderer = REPORT_OPTION_RENDERERS[kind];

  return (
    <div style={{ padding: '16px 0' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: color,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        보고서 설정
      </div>
      {renderer ? (
        renderer(opts, subOpts, topN)
      ) : (
        <div style={{ color: 'var(--text-4)', fontSize: 13, padding: '16px 0' }}>
          저장된 옵션 없음
        </div>
      )}
    </div>
  );
}
