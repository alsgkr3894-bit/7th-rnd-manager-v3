'use client';
import { SectionDot, S_SECTION_TITLE_FLEX } from './SalesReportSectionParts';

export function SalesExcludedListSection({ excludedList }) {
  return (
    <div className="paper-section" style={{ pageBreakBefore: 'always', marginTop: 24 }}>
      <div className="paper-section-title" style={S_SECTION_TITLE_FLEX}>
        <SectionDot color="var(--text-3)" />
        품목 제외 리스트
        <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
          {excludedList.length}개
        </span>
      </div>
      {excludedList.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>
          제외된 품목이 없습니다.
        </div>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {excludedList.map((name, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: 'var(--text-2)',
                minWidth: 140,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--text-3)',
                  flexShrink: 0,
                }}
              />
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
