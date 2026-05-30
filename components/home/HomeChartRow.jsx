'use client';
import { Icon } from '@/components/icons';
import { fmtKRW, formatPercent } from '@/lib/format';
import { useCountUp } from '@/lib/useCountUp';
import { AreaChart } from '@/components/charts/AreaChart';
import { Donut } from '@/components/charts/Donut';
import { EmptyState, SkeletonChart } from './HomeWidgets';

export function HomeChartRow({
  trend, donut, hoveredCat, setHoveredCat,
  chartTab, setChartTab, chartKey, salesKpi, router, isTrendEmpty,
}) {
  return (
    <div className="mid-row motion-stagger">
      <div className="card chart-card">
        <div className="card-header">
          <div>
            <div className="card-title">메뉴 총 판매량 추이</div>
            <div className="card-sub">
              {chartTab === 'year' ? '연 단위 합산 · 최근 5년' : '월 단위 비교 · 최근 6개월'}
            </div>
          </div>
          <div className="chart-tabs">
            <button className={chartTab==='month'?'active':''} onClick={()=>setChartTab('month')}>월별</button>
            <button className={chartTab==='year'?'active':''} onClick={()=>setChartTab('year')}>년별</button>
          </div>
        </div>
        {isTrendEmpty ? (
          <EmptyState
            icon={<Icon.chart style={{width:32,height:32}}/>}
            title="판매량 데이터가 없습니다"
            desc="메뉴 판매량을 업로드하면 추이가 표시됩니다"
            action="판매량 업로드"
            onAction={() => router.push('/menu-sales/upload')}
          />
        ) : trend ? (
          <>
            <div className="chart-legend">
              {trend.mode === 'year' ? (
                <span><span className="dot" style={{background:'var(--accent)'}}></span>연간 판매량</span>
              ) : (
                <>
                  <span><span className="dot" style={{background:'var(--accent)'}}></span>이번 연도</span>
                  <span><span className="dot" style={{background:'var(--text-4)'}}></span>지난 연도 동월</span>
                </>
              )}
            </div>
            <AreaChart key={chartKey}
              labels={trend.labels}
              series={trend.mode === 'year'
                ? [{ name:'연간 판매량', data:trend.thisYear }]
                : [{ name:'이번 연도', data:trend.thisYear }, { name:'지난 연도', data:trend.lastYear }]}
              colors={trend.mode === 'year' ? ['var(--accent)'] : ['var(--accent)','var(--text-4)']}
              formatY={(v) => fmtKRW(v) + '개'}
            />
          </>
        ) : (
          <SkeletonChart />
        )}
      </div>

      <div className="card ring-card">
        <div className="card-header">
          <div>
            <div className="card-title">카테고리별 비중</div>
            <div className="card-sub">
              {salesKpi?.year && salesKpi?.month ? `${salesKpi.year}년 ${salesKpi.month}월 기준` : '데이터 없음'}
            </div>
          </div>
          <button className="link" onClick={()=>router.push('/menu-sales/rank')}>자세히</button>
        </div>
        {donut?.total === 0 ? (
          <EmptyState
            icon={<Icon.pizza style={{width:32,height:32}}/>}
            title="데이터 없음"
            desc="판매량을 업로드하면 카테고리 비중이 표시됩니다"
          />
        ) : donut ? (
          <DonutSection donut={donut} hoveredCat={hoveredCat} setHoveredCat={setHoveredCat}/>
        ) : (
          <SkeletonChart />
        )}
      </div>
    </div>
  );
}

function DonutSection({ donut, hoveredCat, setHoveredCat }) {
  const center = useCountUp(donut?.total ?? 0, { duration: 1400, delay: 250 });
  return (
    <div className="ring-wrap">
      <div className="ring">
        <Donut items={donut.items} onSegmentHover={setHoveredCat} />
        <div className="center">
          <div className="v num">{fmtKRW(center)}</div>
          <div className="l">개</div>
        </div>
      </div>
      <div className="ring-rows">
        {donut.items.map((c,i) => (
          <div key={c.name} className="ring-row" style={{
            opacity: hoveredCat !== null && hoveredCat !== i ? 0.4 : 1,
            transition: 'opacity 200ms ease',
            fontWeight: hoveredCat === i ? 800 : undefined,
          }}>
            <div className="swatch" style={{background:c.color}}></div>
            <div className="name">{c.name}</div>
            <div className="v num">{formatPercent((c.value / donut.total) * 100)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
