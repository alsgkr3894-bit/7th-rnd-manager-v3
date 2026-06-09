'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { Stars } from './_Stars';
import { sampleNamesText, sampleNamesOf } from '@/lib/sample';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { useModalShell } from '@/hooks/useModalShell';
import { asDisplayText, asFiniteNumber, asObjectArray, clampInteger } from '@/lib/ui/prop-guards';

const noop = () => {};

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:13, color:'var(--text-1)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{children}</div>
    </div>
  );
}

export function SampleDetailModal({ sample = {}, onClose, onEdit, onDelete }) {
  const router = useRouter();
  const [photoIdx, setPhotoIdx] = useState(0);
  const safeSample = sample && typeof sample === 'object' ? sample : {};
  const photos = asObjectArray(safeSample.photos).filter(p => asDisplayText(p.data));
  const currentPhotoIdx = photos.length > 0 ? Math.min(photoIdx, photos.length - 1) : 0;
  const currentPhoto = photos[currentPhotoIdx];
  const { imgRef, scale, resetScale } = usePinchZoom();
  const closeModal = typeof onClose === 'function' ? onClose : noop;
  const edit = typeof onEdit === 'function' ? onEdit : noop;
  const remove = typeof onDelete === 'function' ? onDelete : noop;
  const { containerRef, isClosing, close } = useModalShell(closeModal);

  useEffect(() => {
    resetScale();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoIdx]);

  const tags = asDisplayText(safeSample.tags).split(',').map(t => t.trim()).filter(Boolean);
  const names = sampleNamesText(safeSample);
  const title = asDisplayText(safeSample.title, '제목 없음');
  const category = asDisplayText(safeSample.category);
  const testDate = asDisplayText(safeSample.testDate);
  const company = asDisplayText(safeSample.company);
  const tester = asDisplayText(safeSample.tester);
  const description = asDisplayText(safeSample.description);
  const result = asDisplayText(safeSample.result);
  const improvements = asDisplayText(safeSample.improvements);
  const nextAction = asDisplayText(safeSample.nextAction);
  const rating = clampInteger(safeSample.rating, { min: 0, max: 5, fallback: 0 });
  const price = asFiniteNumber(safeSample.price);

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:300,
        background:'rgba(0,0,0,0.62)', display:'flex', alignItems:'center', justifyContent:'center',
        padding:16, animation:'fade 150ms ease',
      }}
    >
      <div
        ref={containerRef}
        className={'modal-anim' + (isClosing ? ' modal-exit' : '')}
        style={{
          background:'var(--surface)', borderRadius:20, overflow:'hidden',
          width:'100%', maxWidth:880, maxHeight:'92vh', display:'flex', flexDirection:'column',
          boxShadow:'var(--shadow-lg)',
        }}
      >
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          padding:'16px 20px 12px', borderBottom:'1px solid var(--border)',
          flexShrink:0,
        }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              {category && (
                <span style={{
                  background:'var(--accent-soft)', color:'var(--accent-text)',
                  fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:700,
                }}>{category}</span>
              )}
              {rating > 0 && <Stars value={rating}/>}
            </div>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--text-1)' }}>{title}</div>
            <div style={{ fontSize:13, color:'var(--text-3)', marginTop:2, display:'flex', flexWrap:'wrap', gap:'2px 10px' }}>
              {names && <span style={{ fontWeight:600, color:'var(--text-2)' }}>{names}</span>}
              {testDate && <span>{testDate}</span>}
              {company && <span>{company}</span>}
              {tester  && <span>담당: {tester}</span>}
              {price != null && <span>{price.toLocaleString('ko-KR')}원 {safeSample.priceTaxType === 'excl' ? '(부가세 별도)' : '(부가세 포함)'}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0, marginLeft:16 }}>
            <button
              className="btn sm"
              title="이 샘플 기록을 기반으로 레시피 초안 만들기"
              onClick={() => {
                const params = new URLSearchParams();
                const firstName = sampleNamesOf(safeSample)[0];
                if (firstName) params.set('name', firstName);
                if (category) params.set('cat', category);
                params.set('from', 'sample');
                router.push('/cost/recipe?' + params.toString());
                closeModal();
              }}
              style={{ fontSize:11, display:'flex', alignItems:'center', gap:4 }}
            >
              <Icon.plus style={{ width:11, height:11 }}/> 레시피 초안
            </button>
            <button className="btn sm" onClick={edit}>수정</button>
            <button className="btn sm" style={{ color:'var(--negative)' }} onClick={remove}>삭제</button>
            <button
              aria-label="닫기"
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', padding:4 }}
              onClick={close}
            >
              <Icon.close aria-hidden="true" style={{ width:18, height:18 }}/>
            </button>
          </div>
        </div>

        <div style={{ overflowY:'auto', flex:1, display:'grid', gridTemplateColumns: photos.length ? '1fr 1fr' : '1fr' }}>
          {photos.length > 0 && (
            <div style={{ background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, position:'relative', overflow:'hidden' }}>
              <img
                ref={imgRef}
                src={currentPhoto?.data}
                alt={`${names || title} 테스트 사진 ${currentPhotoIdx + 1}번 / 총 ${photos.length}장`}
                loading="lazy"
                style={{
                  maxWidth:'100%', maxHeight:480, objectFit:'contain',
                  touchAction: scale > 1 ? 'none' : 'auto',
                  transformOrigin:'center center',
                  transition: 'transform 0.05s',
                }}
              />
              {photos.length > 1 && (
                <>
                  <button
                    aria-label="이전 사진"
                    onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                    disabled={currentPhotoIdx === 0}
                    style={{
                      position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                      background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
                      color:'#fff', width:32, height:32, cursor:'pointer', fontSize:18,
                      opacity: currentPhotoIdx === 0 ? 0.3 : 1,
                    }}
                  ><span aria-hidden="true">‹</span></button>
                  <button
                    aria-label="다음 사진"
                    onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))}
                    disabled={currentPhotoIdx === photos.length - 1}
                    style={{
                      position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
                      color:'#fff', width:32, height:32, cursor:'pointer', fontSize:18,
                      opacity: currentPhotoIdx === photos.length - 1 ? 0.3 : 1,
                    }}
                  ><span aria-hidden="true">›</span></button>
                  <div style={{ display:'flex', gap:6, padding:'10px 12px', overflowX:'auto', width:'100%', boxSizing:'border-box' }}>
                    {photos.map((p, i) => (
                      <button key={i}
                        aria-label={`사진 ${i + 1}번${i === currentPhotoIdx ? ' (현재)' : ''}`}
                        aria-pressed={i === currentPhotoIdx}
                        onClick={() => setPhotoIdx(i)}
                        style={{
                          width:52, height:40, flexShrink:0, borderRadius:6, overflow:'hidden',
                          border: i === currentPhotoIdx ? '2px solid #fff' : '2px solid transparent',
                          padding:0, cursor:'pointer', background:'#222',
                        }}>
                        <img src={p.data} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            {description && (
              <Section title="테스트 내용 / 조건">{description}</Section>
            )}
            {result && (
              <Section title="평가 / 결과">{result}</Section>
            )}
            {improvements && (
              <Section title="개선사항">{improvements}</Section>
            )}
            {nextAction && (
              <Section title="다음 액션">{nextAction}</Section>
            )}
            {tags.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:6 }}>태그</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {tags.map(t => (
                    <span key={t} style={{
                      background:'var(--surface-2)', color:'var(--text-2)',
                      fontSize:11, padding:'2px 8px', borderRadius:10, border:'1px solid var(--border)',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {!description && !result && !improvements && !nextAction && tags.length === 0 && (
              <div style={{ color:'var(--text-3)', fontSize:13 }}>상세 내용이 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
