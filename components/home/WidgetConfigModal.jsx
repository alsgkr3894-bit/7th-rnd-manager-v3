'use client';
import { Icon } from '@/components/icons';
import { useModalShell } from '@/hooks/useModalShell';
import { HOME_WIDGET_DEFS } from '@/hooks/useWidgetConfig';

/**
 * 홈 위젯 표시/숨김 설정 모달.
 * @param {{ isVisible: (key:string)=>boolean, toggle: (key:string)=>void, onClose: ()=>void }} props
 */
export function WidgetConfigModal({ isVisible, toggle, onClose }) {
  const { containerRef, isClosing, close } = useModalShell(onClose);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:500,display:'grid',placeItems:'center',animation:'fade 150ms ease'}}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div ref={containerRef} className={'card modal-anim' + (isClosing ? ' modal-exit' : '')} style={{width:'min(360px,92vw)',padding:'24px 28px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:15,color:'var(--text-1)'}}>홈 위젯 설정</div>
          <button className="btn xs" aria-label="설정 닫기" onClick={close}>
            <Icon.close style={{width:15,height:15}}/>
          </button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {HOME_WIDGET_DEFS.map(w => (
            <label key={w.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',padding:'6px 0'}}>
              <span style={{fontSize:14,color:'var(--text-2)'}}>{w.label}</span>
              <div className="widget-toggle" style={{position:'relative'}}>
                <input type="checkbox" checked={isVisible(w.key)} onChange={() => toggle(w.key)}
                  style={{position:'absolute',opacity:0,width:0,height:0}}/>
                <div style={{
                  width:38,height:22,borderRadius:11,
                  background: isVisible(w.key) ? 'var(--accent)' : 'var(--border-strong)',
                  transition:'background .15s',position:'relative',
                }}>
                  <div style={{
                    position:'absolute',top:3,
                    left: isVisible(w.key) ? 18 : 3,
                    width:16,height:16,borderRadius:8,
                    background:'#fff',transition:'left .15s',
                    boxShadow:'var(--shadow-sm)',
                  }}/>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
