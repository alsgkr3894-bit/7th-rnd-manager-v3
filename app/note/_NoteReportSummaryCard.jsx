'use client';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { copyText } from '@/lib/ui/clipboard';
import { CollapsibleCard } from '@/app/note/_CollapsibleCard';

export function NoteReportSummaryCard({ reportText }) {
  async function copyReport() {
    try {
      if (!(await copyText(reportText))) throw new Error('CLIPBOARD_UNAVAILABLE');
      showToast('보고용 요약이 복사됐어요', 'ok');
    } catch {
      showToast('복사 실패 (보안 컨텍스트 필요)', 'warn');
    }
  }

  return (
    <div className="form-sticky-right" style={{ position: 'sticky', top: 80 }}>
      <CollapsibleCard
        title="보고용 요약"
        subtitle="입력 내용이 자동으로 요약됩니다 · 기본 접힘"
        defaultOpen={false}
      >
        <pre
          style={{
            background: 'var(--surface-2)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 12,
            lineHeight: 1.8,
            color: 'var(--text-2)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}
        >
          {reportText}
        </pre>
        <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={copyReport}>
          <Icon.doc style={{ width: 13, height: 13 }} /> 보고용 복사
        </button>
      </CollapsibleCard>
    </div>
  );
}
