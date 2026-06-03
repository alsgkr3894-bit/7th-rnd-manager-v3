import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { reclassifyAllFiles } from '@/lib/sales';

/** 세 설정 섹션(Aliases·Rules·Excluded)이 공유하는 스타일·컴포넌트 */

/**
 * 규칙·별칭·제외 변경 후 이미 업로드된 데이터를 다시 분류해 보고서·통계에 즉시 반영.
 * (변경만 저장하면 기존 sales_rows는 옛 분류 결과를 유지하므로 호출 필요)
 * 실패해도 변경 자체는 유지되므로 토스트로만 안내한다.
 */
export async function reapplyToUploadedData() {
  // 시작 안내(짧게) — Toast는 id 기반 갱신/해제 API가 없어 진행률 표시 대신 시작/완료만 안내.
  // 실제 블로킹 방지는 reclassifyAllFiles가 파일 간 이벤트 루프를 양보(setTimeout 0)해 처리.
  showToast('기존 데이터 재분류 중…', 'info', 1800);
  try {
    const { files } = await reclassifyAllFiles();
    if (files > 0) showToast(`기존 업로드 ${files}개 파일에 반영했어요`, 'ok');
    else showToast('반영할 업로드 파일이 없어요', 'info', 2000);
  } catch (err) {
    console.error('[settings] 재분류 실패:', err);
    showToast('기존 데이터 반영 중 오류가 발생했어요', 'error');
  }
}

export const inputStyle = {
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text-1)', fontSize: 13,
};

export function SectionHeader({ title, count, adding, onAdd }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>
        {title} <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: 6 }}>{count}개</span>
      </div>
      <button className="btn sm" onClick={onAdd}>
        {adding ? '닫기' : <><Icon.plus style={{ width: 12, height: 12 }}/> 추가</>}
      </button>
    </div>
  );
}

export function SectionEmpty({ children }) {
  return (
    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
      {children}
    </div>
  );
}
