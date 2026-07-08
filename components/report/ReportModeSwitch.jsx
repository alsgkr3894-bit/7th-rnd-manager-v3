'use client';

const MODE_OPTIONS = [
  { id: 'cost', label: '원가계산', desc: '원가율·위험 메뉴' },
  { id: 'margin', label: '원가마진표', desc: '플랫폼·할인 마진' },
];

export function ReportModeSwitch({ value = 'cost', onChange }) {
  const safeValue = value === 'margin' ? 'margin' : 'cost';

  return (
    <div className="opt-group">
      <div className="opt-label">보고서 유형</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {MODE_OPTIONS.map(option => {
          const active = safeValue === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`btn sm ${active ? 'primary' : 'ghost'}`}
              onClick={() => onChange?.(option.id)}
              style={{
                minHeight: 52,
                alignItems: 'flex-start',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span style={{ fontWeight: 800 }}>{option.label}</span>
              <span style={{ fontSize: 11, opacity: active ? 0.9 : 0.7 }}>{option.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
