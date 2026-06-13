'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SortButton } from '@/components/ui/SortButton';
import { usePagination } from '@/hooks/usePagination';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { initDB } from '@/lib/db';
import { formatNumber, formatUnitPrice } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getAllIngredients,
  getIngredientMetaMap,
  mergeIngredientRows,
  getCategoryStyle,
  getPrimaryIngredientPhoto,
  countIngredientPhotos,
  INGREDIENT_PHOTO_SLOTS,
  normalizeIngredientPhotos,
  sortMainCategories,
  sortHashTags,
  buildMetaOnlyRow,
  buildProductTypeMap,
} from '@/lib/ingredient';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import { downloadCsv } from '@/lib/download';
import {
  SCOPE,
  SCOPE_STYLES,
  DISCONTINUED_FILTER,
  UNCATEGORIZED_FILTER,
} from '@/lib/ingredient/constants';
import { IngredientListSkeleton } from '@/components/ui/Skeleton';
import { KEYS } from '@/lib/note/keys';
import {
  ALLERGEN_MAP,
  ingredientName,
  originText,
  allergenText,
  printIngredientPdf,
} from '@/lib/ingredient/print';

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

const INGREDIENT_LIST_COLS = 10;

function ingredientRowKey(row, index = 0) {
  if (row?.id != null) return `id:${row.id}`;
  if (row?.productCode) return `code:${row.productCode}`;
  return `row:${ingredientName(row)}:${index}`;
}

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [catFilter, setCatFilter] = useLocalStorage(KEYS.INGREDIENT_LIST_CAT_FILTER, 'all', value =>
    typeof value === 'string' && value ? value : 'all'
  );
  const [tagFilter, setTagFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const [pdfPhoto, setPdfPhoto] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const mountedRef = useMounted();

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;

    const [allMeta, metaMap, managed] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
      seedManagedProductsIfEmpty().then(() => getManagedProducts()),
    ]);
    if (!mountedRef.current) return;
    const typeMap = buildProductTypeMap(managed);

    if (!latest) {
      setRows(allMeta.filter(m => m.isManual || m.isSeeded).map(buildMetaOnlyRow));
      return;
    }

    const priceRows = await getPriceRowsByFileId(latest.id);
    if (!mountedRef.current) return;
    // 마스터(시드/수동)에 등록된 항목만 표시
    const merged = mergeIngredientRows(priceRows, metaMap, typeMap).filter(r => r.hasRecord);
    const priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
    const orphanRows = allMeta
      .filter(
        m => (m.isManual || m.isSeeded) && (!m.productCode || !priceCodeSet.has(m.productCode))
      )
      .map(buildMetaOnlyRow);

    setRows([...merged, ...orphanRows]);
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (mountedRef.current) console.error(err);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);

  // ── 통계 ────────────────────────────────────────────────────
  const {
    active,
    totalCount,
    exclusiveCnt,
    generalCnt,
    generalMgtCnt,
    linkedCount,
    discontinuedCount,
    linkPct,
  } = useMemo(() => {
    const active = rows.filter(r => !r.discontinued && !r.excluded);
    const totalCount = active.length;
    const exclusiveCnt = active.filter(r => r.scope === SCOPE.EXCLUSIVE).length;
    const generalCnt = active.filter(r => r.scope === SCOPE.GENERIC).length;
    const generalMgtCnt = active.filter(r => r.scope === SCOPE.GENERIC_MANAGED).length;
    const linkedCount = active.filter(r => r.jetteLinked).length;
    const discontinuedCount = rows.filter(r => r.discontinued).length;
    const linkPct = totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0;
    return {
      active,
      totalCount,
      exclusiveCnt,
      generalCnt,
      generalMgtCnt,
      linkedCount,
      discontinuedCount,
      linkPct,
    };
  }, [rows]);

  // ── 분류(메인) 집합 ─────────────────────────────────────────
  const mainCats = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (!r.discontinued && !r.excluded && r.category) set.add(r.category);
    });
    return sortMainCategories(Array.from(set));
  }, [rows]);

  // ── 해시태그 집합 ──────────────────────────────────────────
  const hashTags = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (r.discontinued || r.excluded) return;
      (r.tags || []).forEach(t => t && set.add(t));
    });
    return sortHashTags(Array.from(set));
  }, [rows]);

  const uncategorizedCount = rows.filter(r => !r.discontinued && !r.excluded && !r.category).length;

  // ── 필터링 + 정렬 ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list;
    if (catFilter === DISCONTINUED_FILTER) {
      list = rows.filter(r => r.discontinued);
    } else {
      list = rows.filter(r => !r.discontinued && !r.excluded);
      if (scopeFilter !== 'all') list = list.filter(r => r.scope === scopeFilter);
      if (catFilter === UNCATEGORIZED_FILTER) list = list.filter(r => !r.category);
      else if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
      if (tagFilter !== 'all') list = list.filter(r => (r.tags || []).includes(tagFilter));
    }
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          (r.ingredientName || r.displayName || r.productName || '').toLowerCase().includes(q) ||
          (r.productCode || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (r.manufacturer || '').toLowerCase().includes(q)
      );
    if (sort === 'name')
      return [...list].sort((a, b) =>
        (a.ingredientName || a.displayName || '').localeCompare(
          b.ingredientName || b.displayName || '',
          'ko'
        )
      );
    if (sort === 'category')
      return [...list].sort((a, b) => {
        const ca = a.category || 'ㅎ',
          cb = b.category || 'ㅎ';
        if (ca !== cb) return ca.localeCompare(cb, 'ko');
        return (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko');
      });
    if (sort === 'price-desc')
      return [...list].sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0));
    if (sort === 'price-asc')
      return [...list].sort((a, b) => (a.unitPrice || 0) - (b.unitPrice || 0));
    return list;
  }, [rows, scopeFilter, catFilter, tagFilter, search, sort]);

  const scopeTabCount = id => {
    if (id === 'all') return totalCount;
    return active.filter(r => r.scope === id).length;
  };

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 60);

  useEffect(() => {
    setExpandedKey(null);
  }, [page, search, scopeFilter, catFilter, tagFilter, sort]);

  // 검색/필터 변경 시 1페이지로 리셋
  useEffect(() => {
    goTo(1);
  }, [search, scopeFilter, catFilter, tagFilter, sort]); // eslint-disable-line react-hooks/exhaustive-deps

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
            >
              <Icon.doc style={{ width: 14, height: 14 }} /> PDF
            </button>
            <button className="btn" onClick={() => exportIngredientCsv(filtered)}>
              <Icon.download style={{ width: 14, height: 14 }} /> 현재 목록 CSV
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

// ── 행 컴포넌트 ──────────────────────────────────────────────

function IngredientRow({ r, rowKey, isExpanded, onToggle }) {
  const name = r.ingredientName || r.displayName || r.productName;
  const unit = r.baseUnitType || r.salesUnit || 'g';
  const uPrice = r.unitPrice;
  const unitPriceLabel = formatUnitPrice(uPrice, unit);
  const tags = sortHashTags(r.tags || []);
  const photo = getPrimaryIngredientPhoto(r);
  const photoCount = countIngredientPhotos(r);
  const { color: scopeColor = 'var(--text-2)', bg: scopeBg = 'var(--surface-3)' } =
    SCOPE_STYLES[r.scope] || {};
  const toggle = () => onToggle?.(rowKey);
  const handleKeyDown = e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle();
  };

  return (
    <>
      <tr
        className={'ingredient-list-summary' + (isExpanded ? ' ingredient-list-summary-open' : '')}
        style={{ opacity: r.discontinued ? 0.55 : 1 }}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        <td style={{ color: 'var(--text-3)', fontSize: 11 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Icon.chevRight
              className="ingredient-list-chevron"
              style={{
                width: 13,
                height: 13,
                flexShrink: 0,
                transform: isExpanded ? 'rotate(90deg)' : undefined,
              }}
            />
            {r.isManual && !r.productCode ? (
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'var(--surface-3)',
                  color: 'var(--text-3)',
                }}
              >
                수동
              </span>
            ) : (
              <span>{r.productCode || '-'}</span>
            )}
          </span>
        </td>
        <td style={{ width: 70 }}>
          {photo ? (
            <div style={{ position: 'relative', width: 72, height: 56 }}>
              <img
                src={photo.data}
                alt={photo.name || name}
                style={{
                  width: 72,
                  height: 56,
                  objectFit: 'contain',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  display: 'block',
                }}
              />
              {photoCount > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    right: -5,
                    bottom: -5,
                    minWidth: 17,
                    height: 17,
                    padding: '0 4px',
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 900,
                    display: 'grid',
                    placeItems: 'center',
                    border: '1px solid var(--surface)',
                  }}
                >
                  {photoCount}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
          )}
        </td>
        <td style={{ fontWeight: 600, fontSize: 13 }}>
          <span title={r.productName !== name ? `원본: ${r.productName}` : undefined}>{name}</span>
        </td>
        <td>
          {r.category ? (
            <span
              className="chip"
              style={{ ...getCategoryStyle(r.category), padding: '2px 8px', fontSize: 11 }}
            >
              {r.category}
            </span>
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
          )}
        </td>
        <td>
          {tags.length > 0 ? (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {tags.map(t => (
                <span
                  key={t}
                  style={{
                    padding: '1px 5px',
                    fontSize: 10,
                    fontWeight: 500,
                    borderRadius: 3,
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
          )}
        </td>
        <td>
          <span
            style={{
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              background: scopeBg,
              color: scopeColor,
            }}
          >
            {r.scope || '-'}
          </span>
        </td>
        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{unit}</td>
        <td
          style={{
            textAlign: 'right',
            fontSize: 12,
            fontWeight: unitPriceLabel ? 600 : undefined,
            color: unitPriceLabel ? undefined : 'var(--text-4)',
          }}
        >
          {unitPriceLabel || '—'}
        </td>
        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.manufacturer || '-'}</td>
        <td>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: r.jetteLinked ? 'var(--positive)' : 'var(--warn)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                flexShrink: 0,
                background: r.jetteLinked ? 'var(--positive)' : 'var(--warn)',
              }}
            />
            {r.jetteLinked ? '연동' : '미연동'}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="ingredient-detail-row">
          <td colSpan={INGREDIENT_LIST_COLS}>
            <IngredientDetailPanel row={r} name={name} unitPriceLabel={unitPriceLabel} />
          </td>
        </tr>
      )}
    </>
  );
}

function IngredientDetailPanel({ row, name, unitPriceLabel }) {
  const tags = sortHashTags(row.tags || []);
  const photos = normalizeIngredientPhotos(row.photos, row.photo);
  const unit = row.baseUnitType || row.salesUnit || '-';
  const baseQuantity =
    row.baseQuantity != null && row.baseQuantity !== ''
      ? `${formatNumber(row.baseQuantity)}${row.baseUnitType || ''}`
      : '-';
  const origin = originText(row) || (row.originHidden ? '미표시대상' : '-');
  const allergens = allergenText(row) || '-';
  const status = row.discontinued
    ? '단종'
    : row.excluded
      ? '숨김'
      : row.jetteLinked
        ? '제때 연동'
        : '미연동';

  return (
    <div className="ingredient-detail-panel">
      <aside className="ingredient-detail-media">
        <div className="ingredient-detail-photo-grid">
          {INGREDIENT_PHOTO_SLOTS.map(slot => {
            const photo = photos[slot.key];
            return (
              <div key={slot.key} className="ingredient-detail-photo-card">
                <div className="ingredient-detail-photo-label">{slot.label}</div>
                <div className="ingredient-detail-photo">
                  {photo ? (
                    <img src={photo.data} alt={photo.name || `${name || '식자재'} ${slot.label}`} />
                  ) : (
                    <span>사진 없음</span>
                  )}
                </div>
                <div className="ingredient-detail-media-caption">
                  <span>{photo?.name || slot.hint}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
      <div className="ingredient-detail-info">
        <div className="ingredient-detail-header">
          <div>
            <div className="ingredient-detail-title">{name || '이름 없음'}</div>
            <div className="ingredient-detail-sub">
              {row.productName && row.productName !== name
                ? `원본명: ${row.productName}`
                : '식자재 상세 정보'}
            </div>
          </div>
          <div className="ingredient-detail-badges">
            {row.category && <span>{row.category}</span>}
            {row.scope && <span>{row.scope}</span>}
            <span className={row.jetteLinked ? 'ok' : 'warn'}>{status}</span>
          </div>
        </div>
        <div className="ingredient-detail-sections">
          <DetailSection title="기본 정보">
            <DetailItem label="제품코드" value={row.productCode || '수동 등록'} />
            <DetailItem label="제조사" value={row.manufacturer || '-'} />
            <DetailItem label="보관온도" value={row.temperature || '-'} />
            <DetailItem label="상태" value={status} />
          </DetailSection>
          <DetailSection title="가격·단위">
            <DetailItem label="단위" value={unit} />
            <DetailItem label="포장단위" value={baseQuantity} />
            <DetailItem label="단가" value={unitPriceLabel || '-'} />
            <DetailItem label="과세구분" value={row.taxType || '-'} />
          </DetailSection>
          <DetailSection title="표시 정보" wide>
            <DetailItem label="원산지" value={origin} wide />
            <DetailItem label="알레르기" value={allergens} wide />
            <DetailItem
              label="태그"
              value={
                tags.length > 0 ? (
                  <div className="ingredient-detail-tags">
                    {tags.map(tag => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                ) : (
                  '-'
                )
              }
              wide
            />
          </DetailSection>
          <DetailSection title="비고" wide>
            <DetailItem label="메모" value={row.note || '-'} wide />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children, wide = false }) {
  return (
    <section className={wide ? 'ingredient-detail-section wide' : 'ingredient-detail-section'}>
      <div className="ingredient-detail-section-title">{title}</div>
      <dl className="ingredient-detail-grid">{children}</dl>
    </section>
  );
}

function DetailItem({ label, value, wide = false }) {
  return (
    <div className={wide ? 'ingredient-detail-item wide' : 'ingredient-detail-item'}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
