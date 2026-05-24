'use client';
import { Icon } from '@/components/icons';

/**
 * UploadErrorBanner — 검증 실패 / 중복 월 / 파일 오류 표시
 *
 * @param {{ reason: string, invalidRows?: Array }} error
 */
export function UploadErrorBanner({ error }) {
  if (!error) return null;
  const { reason, invalidRows } = error;

  return (
    <div className="info-banner" style={{
      marginTop:16, background:'var(--negative-soft)', borderColor:'var(--negative-soft)',
    }}>
      <div className="info-banner-ico" style={{background:'var(--negative)', color:'#fff'}}>
        <Icon.alert style={{width:16,height:16}}/>
      </div>
      <div>
        <b>업로드 차단</b> — {reason}
        {invalidRows && invalidRows.length > 0 && (
          <div style={{marginTop:8, fontSize:12, color:'var(--text-2)'}}>
            오류 {invalidRows.length}건 — 상위 5건:{' '}
            {invalidRows.slice(0, 5).map((r, i) => (
              <span key={i} style={{display:'inline-block', marginRight:8}}>
                {r.originalIndex}행 ({r.reason})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
