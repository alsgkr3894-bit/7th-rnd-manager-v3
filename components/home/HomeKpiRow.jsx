'use client';
import { memo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { fmtKRW, formatPercent } from '@/lib/format';
import { Sparkline } from '@/components/charts/Sparkline';

const kpiButtonStyle = {
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  font: 'inherit',
  width: '100%',
};

export const HomeKpiRow = memo(function HomeKpiRow({ salesKpi, costKpi, noteKpi, salesCount, noteCount }) {
  const router = useRouter();
  const [salesPopped, setSalesPopped] = useState(false);
  const [notePopped, setNotePopped] = useState(false);

  useEffect(() => {
    if (salesCount > 0 && !salesPopped) {
      setSalesPopped(true);
    }
  }, [salesCount, salesPopped]);

  useEffect(() => {
    if (noteCount > 0 && !notePopped) {
      setNotePopped(true);
    }
  }, [noteCount, notePopped]);

  return (
    <div className="hero-row motion-stagger">
      <button className="card kpi-card kpi-clickable"
        onClick={() => router.push('/menu-sales/rank-compare')}
        style={kpiButtonStyle}
      >
        <div>
          <div className="label">
            {salesKpi?.year && salesKpi?.month
              ? `${salesKpi.year}년 ${salesKpi.month}월 판매량`
              : '최근 판매량'}
          </div>
          <div className={salesPopped ? 'value num count-landed' : 'value num'}>{fmtKRW(salesCount)}<span className="unit">개</span></div>
          <div className="trend">
            {salesKpi?.deltaPct == null ? (
              <span style={{color:'var(--text-4)'}}>—</span>
            ) : salesKpi.deltaPct === 0 ? (
              <>
                <span style={{color:'var(--text-3)'}}>→ 동일</span>
                <span style={{color:'var(--text-4)'}}>전월 대비</span>
              </>
            ) : (
              <>
                <span className={salesKpi.deltaPct > 0 ? 'up' : 'down'}>
                  {salesKpi.deltaPct > 0
                    ? <Icon.arrowUp   style={{width:12,height:12,display:'inline',verticalAlign:'-2px'}}/>
                    : <Icon.arrowDown style={{width:12,height:12,display:'inline',verticalAlign:'-2px'}}/>}
                  {' '}{salesKpi.deltaPct > 0 ? '+' : ''}{formatPercent(salesKpi.deltaPct)}
                </span>
                <span style={{color:'var(--text-4)'}}>전월 대비</span>
              </>
            )}
          </div>
        </div>
        <Sparkline data={salesKpi?.sparkline ?? []} color="#3182F6" />
      </button>

      <div className="card kpi-card">
        <div>
          <div className="label">평균 원가율<span className="pill">피자 카테고리</span></div>
          <div className="value num" style={{color: costKpi?.rate == null ? 'var(--text-4)' : undefined}}>
            {costKpi?.rate == null ? '—' : costKpi.rate.toFixed(1)}<span className="unit">%</span>
          </div>
          <div className="trend">
            <span style={{color:'var(--text-4)'}}>원가 모듈 구축 예정</span>
          </div>
        </div>
        <Sparkline data={costKpi?.sparkline ?? []} color="#10B981" />
      </div>

      <button className="card kpi-card kpi-clickable"
        onClick={() => router.push('/note')}
        style={kpiButtonStyle}
      >
        <div>
          <div className="label">진행 중 R&amp;D 노트</div>
          <div className={notePopped ? 'value num count-landed' : 'value num'}>{noteCount}<span className="unit">건</span></div>
          <div className="trend">
            {noteKpi?.reporting > 0 ? (
              <>
                <span style={{color:'var(--accent-text)'}}>+{noteKpi.reporting} 보고예정</span>
                <span style={{color:'var(--text-4)'}}>이번 주</span>
              </>
            ) : (
              <span style={{color:'var(--text-4)'}}>아직 보고예정 없음</span>
            )}
          </div>
        </div>
        <Sparkline data={noteKpi?.sparkline ?? []} color="#3182F6" />
      </button>
    </div>
  );
});
