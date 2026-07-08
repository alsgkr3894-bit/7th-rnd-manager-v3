'use client';

import { Icon } from '@/components/icons';
import { REPORT_LAUNCHER_KINDS } from '@/lib/report/constants';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const REPORT_KINDS = REPORT_LAUNCHER_KINDS;

export function ReportKindGrid({ reports, onOpenKind }) {
  const rows = asObjectArray(reports);

  return (
    <div className="report-kind-grid report-kind-grid-auto motion-stagger">
      {REPORT_KINDS.map(kind => {
        const IconEl = Icon[kind.icon] || Icon.doc;
        const count = rows.filter(row => asDisplayText(row.kind) === kind.id).length;
        return (
          <button key={kind.id} className="report-kind-card" onClick={() => onOpenKind(kind.href)}>
            <div
              className="report-kind-ico"
              style={{ background: kind.color + '1A', color: kind.color }}
            >
              <IconEl style={{ width: 22, height: 22 }} />
            </div>
            <div className="report-kind-body">
              <div className="report-kind-title">{kind.title}</div>
              <div className="report-kind-sub">{kind.sub}</div>
            </div>
            <div className="report-kind-foot">
              <span className="report-kind-meta">최근 {count}건</span>
              <Icon.chevRight style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
