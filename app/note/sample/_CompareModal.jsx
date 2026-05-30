'use client';
import { useEffect } from 'react';
import { Icon } from '@/components/icons';
import { Stars } from './_Stars';

export function CompareModal({ samples, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const maxRating = Math.max(...samples.map(s => s.rating || 0));

  const fields = [
    { label: '카테고리', key: 'category' },
    { label: '메뉴명',   key: 'menuName'  },
    { label: '별점',     key: 'rating',   render: (v) => v > 0 ? <Stars value={v}/> : '-' },
    { label: '테스트 내용', key: 'description' },
    { label: '평가 / 결과', key: 'result'      },
    { label: '개선사항',    key: 'improvements'},
  ];

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:400,
        background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center',
        padding:16, animation:'fade 150ms ease',
      }}
    >
      <div
        className="modal-anim"
        style={{
          background:'var(--surface)', borderRadius:20, overflow:'hidden',
          width:'100%', maxWidth:960, maxHeight:'92vh', display:'flex', flexDirection:'column',
          boxShadow:'0 24px 64px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0,
        }}>
          <div style={{ fontSize:17, fontWeight:800, color:'var(--text-1)' }}>
            샘플 비교 ({samples.length}개)
          </div>
          <button
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', padding:4 }}
            onClick={onClose}
          >
            <Icon.close style={{ width:18, height:18 }}/>
          </button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'16px 20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${samples.length}, 1fr)`, gap:12, marginBottom:16 }}>
            {samples.map((s, idx) => (
              <div key={s.id} className="compare-col" style={{ textAlign:'center' }}>
                {s.photos?.[0]?.data ? (
                  <img src={s.photos[0].data} alt=""
                    style={{ width:'100%', maxHeight:140, objectFit:'cover', borderRadius:10, marginBottom:8 }}/>
                ) : (
                  <div style={{
                    width:'100%', height:100, background:'var(--surface-2)',
                    borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:28, marginBottom:8,
                  }}>📷</div>
                )}
                <div style={{ fontWeight:800, fontSize:14, color:'var(--text-1)' }}>
                  <span style={{
                    display:'inline-block', width:22, height:22, borderRadius:'50%',
                    background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:800,
                    lineHeight:'22px', textAlign:'center', marginRight:6,
                  }}>{idx + 1}</span>
                  {s.title}
                </div>
              </div>
            ))}
          </div>

          {fields.map(({ label, key, render }) => (
            <div key={key} style={{
              display:'grid', gridTemplateColumns:`160px repeat(${samples.length}, 1fr)`,
              gap:8, marginBottom:8, alignItems:'start',
            }}>
              <div className="compare-field-label" style={{
                fontSize:11, fontWeight:700, color:'var(--text-3)',
                paddingTop:4, paddingRight:8,
              }}>{label}</div>
              {samples.map(s => {
                const val = s[key];
                const isHighlight = key === 'rating' && (val || 0) === maxRating && maxRating > 0;
                return (
                  <div key={s.id}
                    className={'compare-field-val' + (isHighlight ? ' highlight' : '')}
                    style={{
                      fontSize:13, color:'var(--text-1)', lineHeight:1.6,
                      background:'var(--surface-2)', borderRadius:8, padding:'6px 10px',
                      border: isHighlight ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    {render ? render(val || 0) : (val || <span style={{ color:'var(--text-3)' }}>-</span>)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
