'use client';
import { Icon } from '@/components/icons';

export function CompanyPicker({
  companyRef,
  companyOpen,
  onToggle,
  activeCompany,
  companies,
  onCompanyChange,
}) {
  return (
    <div className="company-wrap" ref={companyRef}>
      <button
        className="company-pick"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={companyOpen}
        aria-label={`브랜드 선택 (현재: ${activeCompany.name})`}
      >
        {activeCompany.logo ? (
          <img
            className="company-logo"
            src={activeCompany.logo}
            alt=""
            style={{ objectFit: 'contain', background: 'white', padding: 2, borderRadius: 4 }}
          />
        ) : (
          <span
            className="company-avatar"
            style={{ background: activeCompany.color }}
            aria-hidden="true"
          >
            {activeCompany.name[0]}
          </span>
        )}
        <div aria-hidden="true">{activeCompany.name}</div>
        <Icon.chevDown
          aria-hidden="true"
          className="arrow"
          style={{
            width: 14,
            height: 14,
            transition: 'transform 160ms',
            transform: companyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {companyOpen && (
        <div className="company-drop" role="menu" aria-label="브랜드 목록">
          <div className="company-drop-label">브랜드 선택</div>
          {companies.map(c => (
            <button
              key={c.id}
              role="menuitemcheckbox"
              aria-checked={activeCompany.id === c.id}
              className={'company-drop-item' + (activeCompany.id === c.id ? ' active' : '')}
              onClick={() => {
                onCompanyChange(c);
                onToggle();
              }}
            >
              <span className="cdrop-logo">
                {c.logo ? (
                  <img
                    src={c.logo}
                    alt=""
                    style={{
                      width: 36,
                      height: 28,
                      objectFit: 'contain',
                      borderRadius: 4,
                      background: 'white',
                      padding: 2,
                    }}
                  />
                ) : (
                  <span className="cdrop-avatar" style={{ background: c.color }}>
                    {c.name[0]}
                  </span>
                )}
              </span>
              <span className="cdrop-info">
                <span className="cdrop-name">{c.name}</span>
                <span className="cdrop-sub">{c.sub}</span>
              </span>
              {activeCompany.id === c.id && (
                <Icon.check
                  style={{ width: 14, height: 14, color: 'var(--accent)', flexShrink: 0 }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
