import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

const S_DOT_LABEL = { display: 'inline-flex', alignItems: 'center', gap: 8 };

export function CostReportRiskList({ riskMenus, riskThreshold }) {
  if (riskMenus.length === 0) return null;

  return (
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
          {riskMenus.map((menu, index) => (
            <RiskMenuRow key={menu.code || menu.name} menu={menu} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskMenuRow({ menu, index }) {
  return (
    <tr>
      <td className="num">{index + 1}</td>
      <td style={{ fontWeight: 700 }}>{menu.name}</td>
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            className="dot"
            style={{ width: 6, height: 6, borderRadius: '50%', background: menu.catColor }}
          />
          {menu.catLabel}
        </span>
      </td>
      <td className="num right muted">{menu.sale > 0 ? `${formatNumber(menu.sale)}원` : '—'}</td>
      <td className="num right" style={{ fontWeight: 800, color: 'var(--warn)' }}>
        {menu.rate.toFixed(1)}% ⚠
      </td>
    </tr>
  );
}
