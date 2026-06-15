'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SortButton } from '@/components/ui/SortButton';
import { getCategoryStyle } from '@/lib/ingredient';
import { downloadCsv } from '@/lib/download';
import { DISCONTINUED_FILTER, UNCATEGORIZED_FILTER, SCOPE } from '@/lib/ingredient/constants';
import { IngredientListSkeleton } from '@/components/ui/Skeleton';
import { ALLERGEN_MAP, printIngredientPdf } from '@/lib/ingredient/print';
import { IngredientRow, ingredientRowKey } from './IngredientListRows';
import { useIngredientCatalogData } from '@/hooks/useIngredientCatalogData';
import { useIngredientCatalogView } from '@/hooks/useIngredientCatalogView';

function exportIngredientCsv(rows) {
  const headers = [
    '식자재명',
    '카테고리',
    '분류',
    '단위',
    '단가',
    '제때연동',
    '원산지',
    '알레르기',
  ];
  const data = rows.map(r => {
    const originText = (r.origin || [])
      .map(o => o.displayName || o.country)
      .filter(Boolean)
      .join(', ');
    const allergenText = (r.allergens || []).map(c => ALLERGEN_MAP[c] || c).join(', ');
    return [
      r.name || r.productName || '',
      r.category || '',
      r.scope || '',
      r.unit || '',
      r.unitPrice != null ? r.unitPrice : '',
      r.jetteLinked ? '연동' : '미연동',
      originText,
      allergenText,
    ];
  });
  downloadCsv([headers, ...data], '식자재리스트.csv');
}

const SCOPE_TABS = [
  { id: 'all', label: '전체' },
  { id: SCOPE.EXCLUSIVE, label: SCOPE.EXCLUSIVE },
  { id: SCOPE.GENERIC, label: SCOPE.GENERIC },
  { id: SCOPE.GENERIC_MANAGED, label: SCOPE.GENERIC_MANAGED },
];

export default function Page() {
  const [pdfPhoto, setPdfPhoto] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const {
    rows,
    loading,
    active,
    totalCount,
    exclusiveCnt,
    generalCnt,
    generalMgtCnt,
    linkedCount,
    discontinuedCount,
    linkPct,
    mainCats,
    hashTags,
    uncategorizedCount,
  } = useIngredientCatalogData();
  const {
    search,
    setSearch,
    scopeFilter,
    setScopeFilter,
    catFilter,
    setCatFilter,
    tagFilter,
    setTagFilter,
    sort,
    setSort,
    filtered,
    page,
    goTo,
    totalPages,
    paged,
    total,
  } = useIngredientCatalogView(rows);

  const scopeTabCount = id => {
    if (id === 'all') return totalCount;
    return active.filter(r => r.scope === id).length;
  };

  useEffect(() => {
    setExpandedKey(null);
  }, [page, search, scopeFilter, catFilter, tagFilter, sort]);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '식자재 리스트']}
        title="식자재 리스트"
        sub="전체 식자재 마스터 카탈로그 — 단가·분류·매핑 상태를 한 곳에서 확인해요."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: 'var(--text-3)',
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={pdfPhoto}
                onChange={e => setPdfPhoto(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              PDF 사진 포함
            </label>
            <button
              className="btn"
              onClick={() => printIngredientPdf(filtered, { includePhotos: pdfPhoto })}
              disabled={loading || filtered.length === 0}
            >
              <Icon.doc style={{ width: 14, height: 14 }} /> PDF
            </button>
            <button
              className="btn"
              onClick={() => exportIngredientCsv(filtered)}
              disabled={loading || filtered.length === 0}
            >
              <Icon.download style={{ width: 14, height: 14 }} /> 엑셀로 내보내기
            </button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">전체 식자재</div>
          <div className="stat-value">
            {totalCount}
            <span className="unit">개</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
            전용 {exclusiveCnt} · 범용 {generalCnt} · 범용관리 {generalMgtCnt}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">연동 식자재</div>
          <div className="stat-value" style={{ color: 'var(--positive)' }}>
            {linkedCount}
            <span className="unit">개</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
            {linkPct}% 단가 매핑 완료
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">미분류</div>
          <div
            className="stat-value"
            style={{ color: uncategorizedCount > 0 ? 'var(--warn)' : undefined }}
          >
            {uncategorizedCount}
            <span className="unit">개</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>분류 설정 필요</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">단종</div>
          <div className="stat-value" style={{ color: 'var(--text-3)' }}>
            {discontinuedCount}
            <span className="unit">개</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
            단종 카테고리 보관
          </div>
        </div>
      </div>

      {loading && <IngredientListSkeleton />}

      {!loading && rows.length === 0 && (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--surface-2)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-4)',
              border: '1px solid var(--border)',
            }}
          >
            <Icon.box style={{ width: 28, height: 28 }} />
          </div>
          <div className="empty-title">아직 식자재 데이터가 없습니다</div>
          <div className="empty-sub">
            식자재 관리에서 마스터 시드를 적용하거나 제때 가격 파일을 업로드해야 합니다.
          </div>
          <a href="/ingredient/manage" className="btn primary" style={{ marginTop: 4 }}>
            <Icon.plus style={{ width: 14, height: 14 }} /> 식자재 관리로 이동
          </a>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="content-enter" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 스코프 탭 + 검색 — 단종 탭에서는 scope/tag 필터가 적용되지 않으므로 숨김 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              {catFilter !== DISCONTINUED_FILTER &&
                SCOPE_TABS.map(t => (
                  <button
                    key={t.id}
                    className={'chip' + (scopeFilter === t.id ? ' active' : '')}
                    onClick={() => setScopeFilter(t.id)}
                  >
                    {t.label} {scopeTabCount(t.id)}
                  </button>
                ))}
            </div>
            <div className="filter-search" style={{ width: 240 }}>
              <Icon.search
                style={{ width: 15, height: 15, color: 'var(--text-3)', flexShrink: 0 }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="재료명·코드·태그 검색"
              />
            </div>
          </div>

          {/* 분류 (메인) */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>
              분류
            </span>
            <button
              className={'chip' + (catFilter === 'all' ? ' active' : '')}
              onClick={() => setCatFilter('all')}
            >
              전체
            </button>
            {mainCats.map(c => {
              const cnt = active.filter(
                r => r.category === c && (scopeFilter === 'all' || r.scope === scopeFilter)
              ).length;
              return (
                <button
                  key={c}
                  className={'chip' + (catFilter === c ? ' active' : '')}
                  style={catFilter !== c ? getCategoryStyle(c) : undefined}
                  onClick={() => setCatFilter(c)}
                >
                  {c} {cnt}
                </button>
              );
            })}
            {uncategorizedCount > 0 && (
              <button
                className={'chip' + (catFilter === UNCATEGORIZED_FILTER ? ' active' : '')}
                style={catFilter !== UNCATEGORIZED_FILTER ? { color: 'var(--warn)' } : undefined}
                onClick={() =>
                  setCatFilter(catFilter === UNCATEGORIZED_FILTER ? 'all' : UNCATEGORIZED_FILTER)
                }
              >
                미분류 {uncategorizedCount}
              </button>
            )}
            {discontinuedCount > 0 && (
              <button
                className={'chip' + (catFilter === DISCONTINUED_FILTER ? ' active' : '')}
                style={
                  catFilter !== DISCONTINUED_FILTER
                    ? { color: 'var(--text-3)', marginLeft: 'auto' }
                    : { marginLeft: 'auto' }
                }
                onClick={() =>
                  setCatFilter(catFilter === DISCONTINUED_FILTER ? 'all' : DISCONTINUED_FILTER)
                }
              >
                단종 {discontinuedCount}
              </button>
            )}
          </div>

          {/* 해시태그 — 단종 탭에서는 태그 필터가 적용되지 않으므로 숨김 */}
          {hashTags.length > 0 && catFilter !== DISCONTINUED_FILTER && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}
              >
                #태그
              </span>
              <button
                className={'chip' + (tagFilter === 'all' ? ' active' : '')}
                onClick={() => setTagFilter('all')}
              >
                전체
              </button>
              {hashTags.map(t => {
                const cnt = active.filter(
                  r =>
                    (r.tags || []).includes(t) &&
                    (scopeFilter === 'all' || r.scope === scopeFilter) &&
                    (catFilter === 'all' || r.category === catFilter)
                ).length;
                if (!cnt) return null;
                return (
                  <button
                    key={t}
                    className={'chip' + (tagFilter === t ? ' active' : '')}
                    style={tagFilter !== t ? { fontSize: 11, opacity: 0.85 } : undefined}
                    onClick={() => setTagFilter(tagFilter === t ? 'all' : t)}
                  >
                    #{t} {cnt}
                  </button>
                );
              })}
              <div style={{ marginLeft: 'auto' }}>
                <SortButton
                  value={sort}
                  onChange={setSort}
                  options={[
                    { id: 'default', label: '기본' },
                    { id: 'name', label: '이름순' },
                    { id: 'category', label: '분류순' },
                    { id: 'price-desc', label: '단가 높은순' },
                    { id: 'price-asc', label: '단가 낮은순' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 테이블 */}
      {!loading && rows.length > 0 && (
        <div className="card table-card content-enter">
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '40px 0',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontSize: 13,
              }}
            >
              조건에 맞는 항목이 없습니다
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table stagger-rows">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>제품코드</th>
                    <th style={{ width: 70 }}>사진</th>
                    <th>재료명</th>
                    <th style={{ width: 96 }}>분류</th>
                    <th style={{ width: 160 }}>#태그</th>
                    <th style={{ width: 80 }}>전용/범용</th>
                    <th style={{ width: 56 }}>단위</th>
                    <th style={{ width: 110, textAlign: 'right' }}>G·개당 단가</th>
                    <th style={{ width: 88 }}>제조사</th>
                    <th style={{ width: 80 }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r, i) => {
                    const rowKey = ingredientRowKey(r, i);
                    return (
                      <IngredientRow
                        key={rowKey}
                        rowKey={rowKey}
                        r={r}
                        isExpanded={expandedKey === rowKey}
                        onToggle={key => setExpandedKey(prev => (prev === key ? null : key))}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--divider)' }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={goTo}
              total={total}
              pageSize={60}
            />
            {totalPages <= 1 && (
              <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)' }}>
                {filtered.length}개 표시 / 전체 {rows.length}개
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
