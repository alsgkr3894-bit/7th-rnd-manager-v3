'use client';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';
import { formatNumber } from '@/lib/format';

/**
 * MarginFilterBar
 *
 * Props:
 *   platforms       – array of platform objects
 *   activePlatId    – currently selected platform id
 *   onPlatId        – (id) => void
 *   onShowSettings  – () => void  (open PlatformSettingsModal)
 *   discOpen        – bool
 *   onDiscOpen      – (bool) => void
 *   discType        – 'pct' | 'fixed'
 *   onDiscType      – (type) => void
 *   discVal         – string
 *   onDiscVal       – (val) => void
 *   discount        – computed discount object | null
 *   activePlatform  – the resolved platform object
 *   viewMode        – 'cost' | 'margin'
 *   onViewMode      – (mode) => void
 *   cats            – string[]
 *   catFilter       – string
 *   onCatFilter     – (cat) => void
 *   search          – string
 *   onSearch        – (val) => void
 */
export function MarginFilterBar({
  platforms,
  activePlatId,
  onPlatId,
  onShowSettings,
  discOpen,
  onDiscOpen,
  discType,
  onDiscType,
  discVal,
  onDiscVal,
  discount,
  activePlatform,
  viewMode,
  onViewMode,
  cats,
  catFilter,
  onCatFilter,
  search,
  onSearch,
}) {
  return (
    <>
      {/* Platform bar */}
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.05em', marginRight:2 }}>플랫폼</span>
        {platforms.map(p => (
          <button key={p.id}
            className={'chip' + (p.id === activePlatId ? ' active' : '')}
            onClick={() => onPlatId(p.id)}
          >
            {p.name}
            {p.id !== 'default' && p.fees?.length > 0 && (
              <span style={{ fontSize:10, marginLeft:4, opacity:.55 }}>{p.fees.length}건</span>
            )}
          </button>
        ))}
        <button className="btn sm" onClick={onShowSettings} title="플랫폼 설정">
          <Icon.gear style={{ width:13, height:13 }}/>
        </button>
        <div style={{ marginLeft:'auto' }}>
          <button
            className={'btn sm' + (discOpen ? ' primary' : '')}
            onClick={() => onDiscOpen(o => !o)}
            style={{ fontSize:11, display:'flex', alignItems:'center', gap:4 }}
          >
            <Icon.calc style={{ width:12, height:12 }}/>
            할인 시뮬레이터
            {discount && <span style={{ fontWeight:700, marginLeft:2 }}>ON</span>}
          </button>
        </div>
      </div>

      {/* Discount simulator bar */}
      {discOpen && (
        <div className="card" style={{ padding:'10px 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginTop:6 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-2)', whiteSpace:'nowrap' }}>할인 적용</span>

          {/* Type toggle */}
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:6, overflow:'hidden' }}>
            {(['pct', 'fixed']).map(t => (
              <button key={t} onClick={() => { onDiscType(t); onDiscVal(''); }}
                style={{
                  padding:'5px 12px', fontSize:12, fontWeight:600, border:'none',
                  background: discType === t ? 'var(--accent)' : 'var(--surface-2)',
                  color: discType === t ? '#fff' : 'var(--text-2)',
                  cursor:'pointer',
                }}
              >
                {t === 'pct' ? '% 할인' : '원 할인'}
              </button>
            ))}
          </div>

          {/* Value input */}
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <input
              className="form-input"
              type="number"
              value={discVal}
              onChange={e => onDiscVal(e.target.value)}
              placeholder={discType === 'pct' ? '예) 20' : '예) 5000'}
              style={{ width:90, textAlign:'right' }}
            />
            <span style={{ fontSize:12, color:'var(--text-3)' }}>{discType === 'pct' ? '%' : '원'}</span>
          </div>

          {/* Status badge */}
          {discount ? (
            <span style={{ fontSize:12, color:'var(--accent)', background:'var(--surface-2)', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
              {discType === 'pct' ? `${discount.value}% 할인` : `${formatNumber(discount.value)}원 할인`} 적용 중
            </span>
          ) : discVal ? (
            <span style={{ fontSize:11, color:'var(--text-4)' }}>양수 값을 입력하세요</span>
          ) : null}

          <button className="btn sm" onClick={() => onDiscVal('')}
            style={{ marginLeft:'auto', fontSize:11, color:'var(--text-3)' }}>
            초기화
          </button>
        </div>
      )}

      {/* Platform fee summary (non-default) */}
      {activePlatform.fees?.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-4)' }}>차감:</span>
          {activePlatform.fees.map(f => (
            <span key={f.id} style={{ fontSize:11, color:'var(--text-3)',
              background:'var(--surface-2)', padding:'2px 10px', borderRadius:4, display:'inline-flex', gap:4, alignItems:'center' }}>
              <b style={{ color:'var(--text-2)' }}>{f.label}</b>
              {f.type === 'pct'
                ? `${f.value}%`
                : `${formatNumber(f.value)}원`}
            </span>
          ))}
        </div>
      )}

      {/* 원가율 / 마진율 탭 */}
      <div style={{ display:'flex', gap:0, margin:'12px 0 0', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', alignSelf:'flex-start', width:'fit-content' }}>
        {[{ key:'cost', label:'원가율' }, { key:'margin', label:'마진율' }].map(({ key, label }) => (
          <button key={key} onClick={() => onViewMode(key)}
            style={{
              padding:'7px 22px', fontSize:13, fontWeight:700, border:'none', cursor:'pointer',
              background: viewMode === key ? 'var(--accent)' : 'var(--surface-2)',
              color: viewMode === key ? '#fff' : 'var(--text-2)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'8px 0 8px' }}>
        {cats.map(c => (
          <button key={c} className={'chip' + (catFilter === c ? ' active' : '')}
            onClick={() => onCatFilter(c)}>{c}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ maxWidth: 320, marginBottom: 4 }}>
        <SearchBox value={search} onChange={onSearch} placeholder="메뉴명 검색..." />
      </div>
    </>
  );
}
