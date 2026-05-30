'use client';
import { useRef, useState, useEffect } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { SAMPLE_CATEGORIES, RATING_LABELS, RATING_COLOR, getAllSamples } from '@/lib/sample';
import { initDB } from '@/lib/db';
import { TagInput } from '@/components/ui/TagInput';
import { SegGroup, Field } from '@/components/note/FormFields';

export const SAMPLE_INIT = {
  title: '', menuName: '', category: SAMPLE_CATEGORIES[0],
  testDate: '', tester: '', batchNo: '',
  description: '', result: '', rating: 0,
  improvements: '', nextAction: '', tags: '',
  photos: [],
};

const MAX_PHOTOS = 8;

async function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1400;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ data: canvas.toDataURL('image/jpeg', 0.78), name: file.name });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')); };
    img.src = url;
  });
}

export function SampleFormBody({ form, setForm }) {
  const fileInputRef = useRef(null);
  const [allTags, setAllTags] = useState([]);
  function upd(k, v) { setForm(f => ({ ...f, [k]: v })); }

  useEffect(() => {
    initDB().then(() => getAllSamples()).then(samples => {
      const set = new Set();
      samples.forEach(s => (s.tags || '').split(',').map(t => t.trim()).filter(Boolean).forEach(t => set.add(t)));
      setAllTags([...set]);
    }).catch(() => {});
  }, []);

  async function handleFiles(files) {
    const current = form.photos || [];
    const slots = MAX_PHOTOS - current.length;
    if (slots <= 0) { showToast(`사진은 최대 ${MAX_PHOTOS}장까지만 등록할 수 있어요`, 'warn'); return; }
    const toAdd = Array.from(files).slice(0, slots);
    try {
      const resized = await Promise.all(toAdd.map(resizePhoto));
      upd('photos', [...current, ...resized]);
    } catch {
      showToast('사진 처리 중 오류가 발생했어요', 'error');
    }
  }

  function removePhoto(i) {
    upd('photos', (form.photos || []).filter((_, idx) => idx !== i));
  }

  function handleDrop(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) handleFiles(files);
  }

  const photos = form.photos || [];

  return (
    <div className="form-layout" style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24, marginTop:24, alignItems:'start' }}>

      {/* ── 좌측 폼 ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* 기본 정보 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:16 }}>기본 정보</div>

          <Field label="제목" required>
            <input className="form-input" value={form.title}
              onChange={e => upd('title', e.target.value)}
              placeholder="예) 불고기 피자 3차 샘플 — 소스 비율 조정"/>
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="메뉴명" required>
              <input className="form-input" value={form.menuName}
                onChange={e => upd('menuName', e.target.value)}
                placeholder="예) 불고기피자"/>
            </Field>
            <Field label="테스트 날짜">
              <input className="form-input" type="date" value={form.testDate}
                onChange={e => upd('testDate', e.target.value)}/>
            </Field>
          </div>

          <Field label="카테고리">
            <SegGroup options={SAMPLE_CATEGORIES} value={form.category} onChange={v => upd('category', v)}/>
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="담당자">
              <input className="form-input" value={form.tester}
                onChange={e => upd('tester', e.target.value)}
                placeholder="예) 김민지"/>
            </Field>
            <Field label="배치 / 회차">
              <input className="form-input" value={form.batchNo}
                onChange={e => upd('batchNo', e.target.value)}
                placeholder="예) 3차, B-03"/>
            </Field>
          </div>

          <Field label="평점">
            <StarPicker value={form.rating} onChange={v => upd('rating', v)}/>
          </Field>
        </div>

        {/* 상세 기록 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:16 }}>
            상세 기록 <span style={{ fontSize:12, fontWeight:400, color:'var(--text-3)' }}>선택</span>
          </div>

          <Field label="테스트 내용 / 조건">
            <textarea className="form-input" style={{ minHeight:96, resize:'vertical' }}
              value={form.description}
              onChange={e => upd('description', e.target.value)}
              placeholder="재료 비율, 조리 시간, 온도, 변경 사항 등"/>
          </Field>

          <Field label="평가 / 결과">
            <textarea className="form-input" style={{ minHeight:80, resize:'vertical' }}
              value={form.result}
              onChange={e => upd('result', e.target.value)}
              placeholder="맛, 식감, 외관, 고객 반응 등"/>
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="개선사항">
              <textarea className="form-input" style={{ minHeight:72, resize:'vertical' }}
                value={form.improvements}
                onChange={e => upd('improvements', e.target.value)}
                placeholder="보완할 부분"/>
            </Field>
            <Field label="다음 액션">
              <textarea className="form-input" style={{ minHeight:72, resize:'vertical' }}
                value={form.nextAction}
                onChange={e => upd('nextAction', e.target.value)}
                placeholder="재테스트 방향, 일정 등"/>
            </Field>
          </div>

          <Field label="태그" hint="입력 후 Enter 또는 콤마">
            <TagInput value={form.tags} onChange={v => upd('tags', v)} suggestions={allTags}/>
          </Field>
        </div>
      </div>

      {/* ── 우측: 사진 ── */}
      <div className="form-sticky-right" style={{ position:'sticky', top:80 }}>
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="card-title">사진</div>
            <span style={{ fontSize:12, color:'var(--text-3)' }}>{photos.length} / {MAX_PHOTOS}</span>
          </div>

          {/* 드래그앤드롭 영역 */}
          {photos.length < MAX_PHOTOS && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border:'2px dashed var(--border)', borderRadius:12,
                padding:'24px 16px', textAlign:'center', cursor:'pointer',
                color:'var(--text-3)', marginBottom:12, transition:'border-color 160ms',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
            >
              <div style={{ fontSize:28, marginBottom:6 }}>📷</div>
              <div style={{ fontSize:13, fontWeight:600 }}>클릭하거나 사진을 끌어다 놓으세요</div>
              <div style={{ fontSize:11, marginTop:4 }}>JPG · PNG · HEIC · 최대 {MAX_PHOTOS}장</div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display:'none' }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />

          {/* 사진 그리드 */}
          {photos.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ borderRadius:8, overflow:'visible', background:'transparent' }}>
                  <div style={{ position:'relative', aspectRatio:'4/3', borderRadius:8, overflow:'hidden', background:'var(--surface-2)' }}>
                    <img src={p.data} alt={p.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position:'absolute', top:4, right:4,
                        background:'rgba(0,0,0,0.55)', border:'none', borderRadius:'50%',
                        width:22, height:22, cursor:'pointer', display:'flex',
                        alignItems:'center', justifyContent:'center', padding:0,
                      }}
                    >
                      <Icon.close style={{ width:11, height:11, color:'#fff' }}/>
                    </button>
                    {i === 0 && (
                      <span style={{
                        position:'absolute', bottom:4, left:4,
                        background:'rgba(0,0,0,0.5)', color:'#fff',
                        fontSize:9, padding:'1px 5px', borderRadius:4, fontWeight:700,
                      }}>대표</span>
                    )}
                  </div>
                  {/* 사진 캡션 */}
                  <input
                    className="form-input"
                    style={{ marginTop:4, fontSize:11, padding:'4px 8px' }}
                    value={p.caption || ''}
                    onChange={e => {
                      const updated = [...photos];
                      updated[i] = { ...updated[i], caption: e.target.value };
                      upd('photos', updated);
                    }}
                    placeholder="캡션 (선택)"
                  />
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    aspectRatio:'4/3', border:'1px dashed var(--border)',
                    borderRadius:8, background:'var(--surface-2)', cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'center', gap:4, color:'var(--text-3)',
                  }}
                >
                  <Icon.plus style={{ width:18, height:18 }}/>
                  <span style={{ fontSize:11 }}>추가</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  function handleClick(e, n) {
    const btn = e.currentTarget;
    btn.classList.remove('star-pop');
    void btn.offsetWidth;
    btn.classList.add('star-pop');
    onChange(value === n ? 0 : n);
  }
  const lit = hovered > 0 ? hovered : value;
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          className={'star-rate-btn' + (n <= lit ? ' lit' : '')}
          style={{ fontSize:22 }}
          onClick={e => handleClick(e, n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
        >★</button>
      ))}
      {value > 0 && (
        <span style={{ marginLeft:6, fontSize:12, color: RATING_COLOR[value] || 'var(--text-2)', fontWeight:600 }}>
          {RATING_LABELS[value]}
        </span>
      )}
    </div>
  );
}

