'use client';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';
import { DiscountSimulator } from '@/components/cost/margin/DiscountSimulator';
import { asObjectArray, asStringArray } from '@/lib/ui/prop-guards';
import { formatNumber } from '@/lib/format';

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
 * @param {string|null} props.edgeFilter - 엣지 필터 (null=전체, 'base'=석쇠기본, 또는 edgeType 문자열)
 * @param {(key:string|null) => void} props.onEdgeFilter - 엣지 필터 변경
 */

const EDGE_BUTTONS = [
  { key: null, label: '전체' },
  { key: 'base', label: '석쇠기본' },
  { key: '씬도우', label: '씬도우' },
  { key: '치즈크러스트', label: '치즈크러스트' },
  { key: '골드스윗크러스트', label: '골드스윗크러스트' },
];

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
  edgeFilter,
  onEdgeFilter,
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
  const handleEdgeFilter = typeof onEdgeFilter === 'function' ? onEdgeFilter : () => {};

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
          <DiscountSimulator.Toggle
            discOpen={discOpen}
            onDiscOpen={handleDiscOpen}
            discount={discount}
          />
        </div>
      </div>

      <DiscountSimulator.Panel
        discOpen={discOpen}
        discType={discType}
        onDiscType={handleDiscType}
        discVal={discVal}
        onDiscVal={handleDiscVal}
        discount={discount}
      />

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
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 4px' }}>
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

      {/* Edge type filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 8px' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-3)',
            letterSpacing: '0.05em',
            marginRight: 2,
          }}
        >
          엣지
        </span>
        {EDGE_BUTTONS.map(({ key, label }) => (
          <button
            key={String(key)}
            className={'chip' + (edgeFilter === key ? ' active' : '')}
            onClick={() => handleEdgeFilter(key)}
          >
            {label}
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
