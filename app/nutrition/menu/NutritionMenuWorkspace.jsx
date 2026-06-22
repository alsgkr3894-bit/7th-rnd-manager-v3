'use client';

import dynamic from 'next/dynamic';
import { SearchBox } from '@/components/ui/SearchBox';

const TabBase = dynamic(
  () => import('@/components/nutrition/menu/TabBase').then(module => ({ default: module.TabBase })),
  { ssr: false }
);
const TabEdge = dynamic(
  () => import('@/components/nutrition/menu/TabEdge').then(module => ({ default: module.TabEdge })),
  { ssr: false }
);
const TabDerived = dynamic(
  () =>
    import('@/components/nutrition/menu/TabDerived').then(module => ({
      default: module.TabDerived,
    })),
  { ssr: false }
);
const TabToppings = dynamic(
  () =>
    import('@/components/nutrition/menu/TabToppings').then(module => ({
      default: module.TabToppings,
    })),
  { ssr: false }
);
const TabResults = dynamic(
  () =>
    import('@/components/nutrition/menu/TabResults').then(module => ({
      default: module.TabResults,
    })),
  { ssr: false }
);
const TabSetCalc = dynamic(
  () =>
    import('@/components/nutrition/menu/TabSetCalc').then(module => ({
      default: module.TabSetCalc,
    })),
  { ssr: false }
);

const TABS = ['베이스 영양성분', '엣지 설정', '추가토핑', '파생 메뉴', '계산 결과', '세트 계산'];

export function NutritionMenuWorkspace({
  tab,
  onTab,
  menus,
  filteredMenus,
  rawMap,
  onRefresh,
  menuMasters,
  edges,
  edgeMap,
  toppings,
  ingredients,
  compositions,
  setComps,
  menuSearch,
  onMenuSearch,
  canEdit = false,
}) {
  return (
    <div className="content-enter">
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginTop: 20,
          flexWrap: 'wrap',
        }}
      >
        <div className="tabs" style={{ flex: '1 1 auto' }}>
          {TABS.map((label, index) => (
            <button
              key={index}
              onClick={() => onTab(index)}
              className={`tab ${tab === index ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        {(tab === 0 || tab === 3 || tab === 4) && (
          <div style={{ flex: '0 0 220px' }}>
            <SearchBox value={menuSearch} onChange={onMenuSearch} placeholder="메뉴명·코드 검색" />
          </div>
        )}
      </div>

      {tab === 0 && (
        <TabBase
          menus={filteredMenus}
          rawMap={rawMap}
          onRefresh={onRefresh}
          menuMasters={menuMasters}
          canEdit={canEdit}
        />
      )}
      {tab === 1 && (
        <TabEdge
          edges={edges}
          edgeMap={edgeMap}
          rawMap={rawMap}
          menus={menus}
          onRefresh={onRefresh}
          onOpenBase={() => onTab(0)}
        />
      )}
      {tab === 2 && (
        <TabToppings
          toppings={toppings}
          ingredients={ingredients}
          onRefresh={onRefresh}
          canEdit={canEdit}
        />
      )}
      {tab === 3 && (
        <TabDerived
          menus={menus}
          ingredients={ingredients}
          compositions={compositions}
          onRefresh={onRefresh}
          menuMasters={menuMasters}
          menuSearch={menuSearch}
          onOpenBase={() => onTab(0)}
          canEdit={canEdit}
        />
      )}
      {tab === 4 && (
        <TabResults
          menus={menus}
          rawMap={rawMap}
          edgeMap={edgeMap}
          compositions={compositions}
          toppings={toppings}
          menuMasters={menuMasters}
          menuSearch={menuSearch}
        />
      )}
      {tab === 5 && (
        <TabSetCalc
          menus={menus}
          rawMap={rawMap}
          edgeMap={edgeMap}
          setComps={setComps}
          menuMasters={menuMasters}
          onRefresh={onRefresh}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
