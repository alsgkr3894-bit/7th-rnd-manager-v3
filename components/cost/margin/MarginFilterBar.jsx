'use client';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';
import { formatNumber } from '@/lib/format';
import { asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

/**
 * 마진 페이지 상단 필터 바 (플랫폼 선택, 할인 시뮬레이터, 카테고리·검색).
 * @param {Object} props
 * @param {Array<{id:string, name:string, fees?:Array<{id:string,label:string,type:'pct'|'fixed',value:number}>}>} props.platforms - 플랫폼 목록
 * @param {string} props.activePlatId - 선택된 플랫폼 id
 * @param {(id:string) => void} props.onPlatId - 플랫폼 변경 핸들러
 * @param {() => void} props.onShowSettings - 플랫폼 설정 모달 열기
 * @param {boolean} props.discOpen - 할인 시뮬레이터 열림 여부
 * @param {(updater: boolean|Function) => void} props.onDiscOpen - 할인 패널 토글
 * @param {'pct'|'fixed'} props.discType - 할인 유형
 * @param {(type:'pct'|'fixed') => void} props.onDiscType - 할인 유형 변경
 * @param {string} props.discVal - 할인 값 입력 문자열
 * @param {(val:string) => void} props.onDiscVal - 할인 값 변경
 * @param {{type:'pct'|'fixed', value:number}|null} props.discount - 계산된 할인 객체
 * @param {{id:string, name:string, fees?:Array}} props.activePlatform - 선택된 플랫폼 객체
 * @param {'cost'|'margin'} props.viewMode - 원가율 / 마진율 보기 모드
 * @param {(mode:'cost'|'margin') => void} props.onViewMode - 보기 모드 변경
 * @param {string[]} props.cats - 카테고리 목록
 * @param {string} props.catFilter - 선택된 카테고리
 * @param {(cat:string) => void} props.onCatFilter - 카테고리 변경
 * @param {string} props.search - 검색어
 * @param {(val:string) => void} props.onSearch - 검색어 변경
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
  const safePlatforms = asObjectArray(platforms);
  const safeCats = asStringArray(cats);
  const safeFees = asObjectArray(activePlatform?.fees);
  const handlePlatId = typeof onPlatId === 'function' ? onPlatId : () => {};
  const handleShowSettings = typeof onShowSettings === 'function' ? onShowSettings : () => {};
  const handleDiscOpen = typeof onDiscOpen === 'function' ? onDiscOpen : () => {};
  const handleDiscType = typeof onDiscType === 'function' ? onDiscType : () => {};
  const handleDiscVal = typeof onDiscVal === 'function' ? onDiscVal : () => {};
  const handleViewMode = typeof onViewMode === 'function' ? onViewMode : () => {};
  const handleCatFilter = typeof onCatFilter === 'function' ? onCatFilter : () => {};

  return (
    <>
      {/* Platform bar */}
      <div
        style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-3)',
            letterSpacing: '0.05em',
            marginRight: 2,
          }}
        >
          플랫폼
        </span>
        {safePlatforms.map(p => (
          <button
            key={p.id}
            className={'chip' + (p.id === activePlatId ? ' active' : '')}
            onClick={() => handlePlatId(p.id)}
          >
            {p.name}
            {p.id !== 'default' && p.fees?.length > 0 && (
              <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.55 }}>{p.fees.length}건</span>
            )}
          </button>
        ))}
        <button className="btn sm" onClick={handleShowSettings} title="플랫폼 설정">
          <Icon.gear style={{ width: 13, height: 13 }} />
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button
            className={'btn sm' + (discOpen ? ' primary' : '')}
            onClick={() => handleDiscOpen(o => !o)}
            style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Icon.calc style={{ width: 12, height: 12 }} />
            할인 시뮬레이터
            {discount && <span style={{ fontWeight: 700, marginLeft: 2 }}>ON</span>}
          </button>
        </div>
      </div>

      {/* Discount simulator bar */}
      {discOpen && (
        <div
          className="card"
          style={{
            padding: '10px 16px',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 6,
          }}
        >
          <span
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', whiteSpace: 'nowrap' }}
          >
            할인 적용
          </span>

          {/* Type toggle */}
          <div
            style={{
              display: 'flex',
              border: '1px solid var(--border)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {['pct', 'fixed'].map(t => (
              <button
                key={t}
                onClick={() => {
                  handleDiscType(t);
                  handleDiscVal('');
                }}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  background: discType === t ? 'var(--accent)' : 'var(--surface-2)',
                  color: discType === t ? '#fff' : 'var(--text-2)',
                  cursor: 'pointer',
                }}
              >
                {t === 'pct' ? '% 할인' : '원 할인'}
              </button>
            ))}
          </div>

          {/* Value input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              className="form-input"
              type="number"
              value={discVal}
              onChange={e => handleDiscVal(e.target.value)}
              placeholder={discType === 'pct' ? '예) 20' : '예) 5000'}
              style={{ width: 90, textAlign: 'right' }}
              min="0"
              max={discType === 'pct' ? '100' : undefined}
            />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {discType === 'pct' ? '%' : '원'}
            </span>
          </div>

          {/* Status badge */}
          {discount ? (
            <span
              style={{
                fontSize: 12,
                color: 'var(--accent)',
                background: 'var(--surface-2)',
                padding: '3px 10px',
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              {discType === 'pct'
                ? `${discount.value}% 할인`
                : `${formatNumber(discount.value)}원 할인`}{' '}
              적용 중
            </span>
          ) : discVal ? (
            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>양수 값을 입력하세요</span>
          ) : null}

          <button
            className="btn sm"
            onClick={() => handleDiscVal('')}
            style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}
          >
            초기화
          </button>
        </div>
      )}

      {/* Platform fee summary (non-default) */}
      {safeFees.length > 0 && (
        <div
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>차감:</span>
          {safeFees.map(f => (
            <span
              key={f.id}
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                background: 'var(--surface-2)',
                padding: '2px 10px',
                borderRadius: 4,
                display: 'inline-flex',
                gap: 4,
                alignItems: 'center',
              }}
            >
              <b style={{ color: 'var(--text-2)' }}>{f.label}</b>
              {f.type === 'pct' ? `${f.value}%` : `${formatNumber(f.value)}원`}
            </span>
          ))}
        </div>
      )}

      {/* 원가율 / 마진율 탭 */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          margin: '12px 0 0',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          alignSelf: 'flex-start',
          width: 'fit-content',
        }}
      >
        {[
          { key: 'cost', label: '원가율' },
          { key: 'margin', label: '마진율' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleViewMode(key)}
            style={{
              padding: '7px 22px',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === key ? 'var(--accent)' : 'var(--surface-2)',
              color: viewMode === key ? '#fff' : 'var(--text-2)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 8px' }}>
        {safeCats.map(c => (
          <button
            key={c}
            className={'chip' + (catFilter === c ? ' active' : '')}
            onClick={() => handleCatFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ maxWidth: 320, marginBottom: 4 }}>
        <SearchBox value={search} onChange={onSearch} placeholder="메뉴명 검색..." />
      </div>
    </>
  );
}
