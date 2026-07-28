'use client';

import { createPortal } from 'react-dom';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { todayLocalDate } from '@/lib/date/local-date';
import { useModalShell } from '@/hooks/useModalShell';
import { OVERLAY_COLOR } from '@/lib/ui/styles';
import {
  MARKET_RESEARCH_TYPES,
  deleteMarketResearch,
  getAllMarketResearch,
  saveMarketResearch,
} from '@/lib/note/market-research';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { NotePhotoSection } from '@/app/note/_NotePhotoSection';

const COMPETITOR_ID = '미지정';
// 경쟁사 이름을 안정적으로 색으로 매핑 — 매번 다른 순서로 렌더링돼도 같은 경쟁사는 같은 색.
const COMPETITOR_COLORS = [
  '#E1101F',
  '#2563EB',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#65A30D',
];

function colorForCompetitor(label) {
  if (!label || label === COMPETITOR_ID) return 'var(--text-4)';
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return COMPETITOR_COLORS[hash % COMPETITOR_COLORS.length];
}

/** 경쟁사별로 묶어 카테고리처럼 보여준다. 미지정(빈 값)은 항상 맨 뒤. */
function groupByCompetitor(rows) {
  const groups = new Map();
  for (const row of rows) {
    const label = String(row.competitor || '').trim() || COMPETITOR_ID;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  }
  return [...groups.entries()]
    .map(([label, items]) => ({ label, items, color: colorForCompetitor(label) }))
    .sort((a, b) => {
      if (a.label === COMPETITOR_ID) return 1;
      if (b.label === COMPETITOR_ID) return -1;
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return a.label.localeCompare(b.label, 'ko');
    });
}

function PhotoLightbox({ photo, onClose }) {
  const { containerRef, isClosing, close } = useModalShell(onClose);
  if (!photo) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: OVERLAY_COLOR,
        display: 'grid',
        placeItems: 'center',
        zIndex: 400,
        padding: 24,
      }}
      onClick={close}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="사진 크게 보기"
        className={'modal-anim' + (isClosing ? ' modal-exit' : '')}
        style={{ maxWidth: '92vw', maxHeight: '92vh', display: 'grid', gap: 10 }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn"
            style={{ padding: '4px 8px' }}
            onClick={close}
            aria-label="닫기"
          >
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <img
          src={photo.data}
          alt={photo.caption || photo.name || '시장조사 사진'}
          style={{
            maxWidth: '92vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: 8,
            display: 'block',
            margin: '0 auto',
          }}
        />
        {photo.caption && (
          <div style={{ color: '#fff', textAlign: 'center', fontSize: 13 }}>{photo.caption}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

const EMPTY_FORM = {
  id: null,
  type: MARKET_RESEARCH_TYPES[0],
  date: '',
  brand: '',
  title: '',
  competitor: '',
  marketTrend: '',
  referencePoint: '',
  developmentDirection: '',
  actionIdea: '',
  tags: '',
  photos: [],
};

function withToday(value = {}) {
  return {
    ...EMPTY_FORM,
    ...value,
    date: value.date || todayLocalDate(),
    photos: Array.isArray(value.photos) ? value.photos : [],
  };
}

function includesQuery(row, query) {
  if (!query) return true;
  const photoText = (Array.isArray(row?.photos) ? row.photos : [])
    .map(photo => [photo?.caption, photo?.name].filter(Boolean).join(' '))
    .join('\n');
  const haystack = [
    row.type,
    row.date,
    row.brand,
    row.title,
    row.competitor,
    row.marketTrend,
    row.referencePoint,
    row.developmentDirection,
    row.actionIdea,
    row.tags,
    photoText,
  ]
    .join('\n')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function hasFormContent(form) {
  return Boolean(
    form.title.trim() ||
    form.marketTrend.trim() ||
    form.referencePoint.trim() ||
    form.developmentDirection.trim() ||
    (Array.isArray(form.photos) && form.photos.some(photo => photo?.data))
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-3)' }}>{label}</span>
      {children}
    </label>
  );
}

function DetailField({ label, value }) {
  if (!String(value || '').trim()) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  );
}

function MarketDetailModal({ row, onClose, onEdit, canEdit, onPhotoClick }) {
  const photos = Array.isArray(row.photos) ? row.photos.filter(photo => photo?.data) : [];
  return (
    <ModalFrame
      title={row.title || row.type}
      subtitle={`${row.date || '날짜 없음'}${row.brand ? ` · ${row.brand}` : ''} · ${row.type}`}
      onClose={onClose}
      width="min(640px, 96vw)"
      zIndex={300}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <DetailField label="경쟁사 / 시장 키워드" value={row.competitor} />
        <DetailField label="시장분석 / 피해 트렌드 방향" value={row.marketTrend} />
        <DetailField label="타브랜드 참고 포인트" value={row.referencePoint} />
        <DetailField label="개발 방향 / 적용 아이디어" value={row.developmentDirection} />
        <DetailField label="다음 액션" value={row.actionIdea} />
        <DetailField label="태그" value={row.tags} />
        {photos.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-3)', marginBottom: 4 }}>
              사진 ({photos.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {photos.map((photo, index) => (
                <figure key={index} style={{ margin: 0 }}>
                  <button
                    type="button"
                    onClick={() => onPhotoClick(photo)}
                    aria-label={`${photo.caption || photo.name || '사진'} 크게 보기`}
                    style={{
                      all: 'unset',
                      cursor: 'zoom-in',
                      display: 'block',
                      width: '100%',
                    }}
                  >
                    <img
                      src={photo.data}
                      alt={photo.caption || photo.name || '시장조사 사진'}
                      style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        objectFit: 'contain',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        display: 'block',
                      }}
                    />
                  </button>
                  {photo.caption && (
                    <figcaption
                      style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, textAlign: 'center' }}
                    >
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>
            닫기
          </button>
          {canEdit && (
            <button type="button" className="btn primary" onClick={onEdit}>
              수정
            </button>
          )}
        </div>
      </div>
    </ModalFrame>
  );
}

export default function MarketResearchPage() {
  return (
    <Suspense
      fallback={
        <main className="main">
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div>
        </main>
      }
    >
      <MarketResearchContent />
    </Suspense>
  );
}

function MarketResearchContent() {
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('edit');
  const appliedEditIdRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(() => withToday());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const filtered = useMemo(() => rows.filter(row => includesQuery(row, query)), [rows, query]);
  const groupedRows = useMemo(() => groupByCompetitor(filtered), [filtered]);
  const competitorOptions = useMemo(() => {
    const values = new Set(
      rows.map(row => String(row.competitor || '').trim()).filter(Boolean)
    );
    return [...values].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getAllMarketResearch());
    } catch (error) {
      console.error('[note/market] load failed', error);
      showToast('시장조사 목록을 불러오지 못했습니다', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 연구일지 카드의 "수정" 클릭(?edit=<id>)으로 들어왔으면 해당 기록의 작성 폼을 자동으로 연다.
  useEffect(() => {
    if (!editIdParam || !canEdit) return;
    if (appliedEditIdRef.current === editIdParam) return;
    const target = rows.find(row => String(row.id) === String(editIdParam));
    if (!target) return;
    appliedEditIdRef.current = editIdParam;
    setForm(withToday(target));
    setWriting(true);
  }, [editIdParam, rows, canEdit]);

  function update(field, value) {
    if (!canEdit) return;
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function startWrite(row = null) {
    if (!canEdit) return;
    setDetailRow(null);
    setForm(withToday(row || {}));
    setWriting(true);
  }

  function closeWrite() {
    setForm(withToday());
    setWriting(false);
  }

  async function handleSave() {
    if (!canEdit) {
      showToast('시장조사 저장은 관리자만 가능합니다', 'warn');
      return;
    }
    if (!hasFormContent(form)) {
      showToast('제목, 시장 흐름, 참고 포인트 또는 사진 중 하나를 입력해주세요', 'warn');
      return;
    }
    setSaving(true);
    try {
      await saveMarketResearch(form);
      showToast(form.id ? '시장조사를 수정했습니다' : '시장조사를 저장했습니다', 'ok');
      closeWrite();
      await load();
    } catch (error) {
      console.error('[note/market] save failed', error);
      showToast('시장조사 저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!canEdit || row?.id == null) return;
    if (!window.confirm('이 시장조사 기록을 삭제할까요?')) return;
    try {
      await deleteMarketResearch(row.id);
      showToast('삭제했습니다', 'ok');
      if (form.id === row.id) closeWrite();
      await load();
    } catch (error) {
      console.error('[note/market] delete failed', error);
      showToast('삭제 실패', 'error');
    }
  }

  return (
    <main className="main market-page">
      <PageHeader
        breadcrumb={['RND', '시장조사']}
        title="시장조사"
        sub="경쟁사, 시장 흐름, 피해 트렌드, 타브랜드 참고 포인트를 기록합니다."
        actions={
          <button
            className="btn primary"
            type="button"
            onClick={() => startWrite()}
            disabled={!canEdit}
          >
            <Icon.plus style={{ width: 14, height: 14 }} /> 작성하기
          </button>
        }
      />

      {!canEdit && roleReady ? (
        <section className="card" style={{ marginTop: 18 }}>
          관리자만 시장조사를 작성할 수 있습니다.
        </section>
      ) : (
        <div className="form-layout market-layout">
          <section className="card table-card market-list-card">
            <div className="market-list-toolbar">
              <div className="market-list-title">
                <div className="card-title">시장조사 목록</div>
                <div className="card-sub">총 {rows.length}건</div>
              </div>
            </div>
            <input
              className="form-input"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="키워드 검색"
              style={{ marginBottom: 12 }}
            />
            <div className="market-list-stack">
              {loading && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>불러오는 중</div>}
              {!loading && filtered.length === 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                  저장된 시장조사가 없습니다.
                </div>
              )}
              {groupedRows.map(group => (
                <div key={group.label} style={{ display: 'grid', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 4,
                      paddingBottom: 4,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: group.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <strong style={{ fontSize: 13 }}>{group.label}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {group.items.length}건
                    </span>
                  </div>
                  {group.items.map(row => {
                    const photos = Array.isArray(row.photos)
                      ? row.photos.filter(photo => photo?.data)
                      : [];
                    return (
                      <article
                        key={row.id}
                        className="market-record-card"
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: 12,
                          background: form.id === row.id ? 'var(--accent-soft)' : 'var(--surface-2)',
                        }}
                      >
                        <div className="market-record-head">
                          <strong className="market-record-title">{row.title || row.type}</strong>
                          {photos.length > 0 && <span className="chip">사진 {photos.length}</span>}
                          <span className="chip">{row.type}</span>
                        </div>
                        {row.competitor && (
                          <div style={{ marginTop: 6 }}>
                            <span
                              className="chip"
                              style={{
                                background: 'var(--surface)',
                                border: `1px solid ${group.color}`,
                                color: group.color,
                                fontWeight: 800,
                              }}
                            >
                              {row.competitor}
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
                          {row.date || '날짜 없음'} {row.brand ? `· ${row.brand}` : ''}
                        </div>
                        <p
                          style={{
                            margin: '8px 0 0',
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: 'var(--text-2)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {row.marketTrend ||
                            row.referencePoint ||
                            row.developmentDirection ||
                            '내용 없음'}
                        </p>
                        {photos.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: 6,
                              overflowX: 'auto',
                              marginTop: 10,
                              paddingBottom: 2,
                            }}
                          >
                            {photos.slice(0, 4).map((photo, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setLightboxPhoto(photo)}
                                aria-label={`${photo.caption || photo.name || '사진'} 크게 보기`}
                                style={{ all: 'unset', cursor: 'zoom-in', flex: '0 0 auto' }}
                              >
                                <img
                                  src={photo.data}
                                  alt={photo.caption || photo.name || '시장조사 사진'}
                                  style={{
                                    width: 72,
                                    height: 54,
                                    objectFit: 'cover',
                                    borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    display: 'block',
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => setDetailRow(row)}
                          >
                            자세히
                          </button>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => startWrite(row)}
                            disabled={!canEdit}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleDelete(row)}
                            disabled={!canEdit}
                            style={{ color: 'var(--negative)' }}
                          >
                            삭제
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {canEdit && !writing && (
        <button
          type="button"
          className="btn primary market-fab"
          onClick={() => startWrite()}
          title="시장조사 작성하기"
        >
          <Icon.plus style={{ width: 16, height: 16 }} /> 작성하기
        </button>
      )}

      {writing && (
        <ModalFrame
          title={form.id ? '시장조사 수정' : '시장조사 작성'}
          onClose={closeWrite}
          width="min(720px, 96vw)"
          zIndex={300}
        >
          <div className="market-write-panel">
              <section className="market-write-card">
                <div className="market-type-row">
                  {MARKET_RESEARCH_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      className={'btn sm' + (form.type === type ? ' primary' : '')}
                      onClick={() => update('type', type)}
                      disabled={!canEdit}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="market-form-row market-form-row-date-title">
                  <Field label="조사 날짜">
                    <input
                      className="form-input"
                      type="date"
                      value={form.date}
                      onChange={event => update('date', event.target.value)}
                      disabled={!canEdit}
                    />
                  </Field>
                  <Field label="제목">
                    <input
                      className="form-input"
                      value={form.title}
                      onChange={event => update('title', event.target.value)}
                      placeholder="예: 냉동 벌집 토핑 경쟁사 적용 여부"
                      disabled={!canEdit}
                    />
                  </Field>
                </div>
                <div className="market-form-row market-form-row-two">
                  <Field label="브랜드 / 출처">
                    <input
                      className="form-input"
                      value={form.brand}
                      onChange={event => update('brand', event.target.value)}
                      placeholder="경쟁사명, 기사, 리포트"
                      disabled={!canEdit}
                    />
                  </Field>
                  <Field label="경쟁사 / 시장 키워드">
                    <input
                      className="form-input"
                      list="market-competitor-options"
                      value={form.competitor}
                      onChange={event => update('competitor', event.target.value)}
                      placeholder="예: 피자, 냉동 토핑, 가성비"
                      disabled={!canEdit}
                    />
                    <datalist id="market-competitor-options">
                      {competitorOptions.map(option => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </Field>
                </div>
                <Field label="시장분석 / 피해 트렌드 방향">
                  <textarea
                    className="form-input"
                    value={form.marketTrend}
                    onChange={event => update('marketTrend', event.target.value)}
                    rows={5}
                    placeholder="시장 흐름, 소비자 반응, 가격대, 피해 트렌드 방향을 적어주세요."
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="타브랜드 참고 포인트">
                  <textarea
                    className="form-input"
                    value={form.referencePoint}
                    onChange={event => update('referencePoint', event.target.value)}
                    rows={4}
                    placeholder="벤치마크한 조리법, 원재료, 패키지, 표현 방식"
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="개발 방향 / 적용 아이디어">
                  <textarea
                    className="form-input"
                    value={form.developmentDirection}
                    onChange={event => update('developmentDirection', event.target.value)}
                    rows={4}
                    placeholder="우리 메뉴에 적용할 방향과 우선순위"
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="다음 액션 / 태그">
                  <div className="market-form-row market-form-row-action-tags">
                    <input
                      className="form-input"
                      value={form.actionIdea}
                      onChange={event => update('actionIdea', event.target.value)}
                      placeholder="예: 원물 비교 테스트 진행"
                      disabled={!canEdit}
                    />
                    <input
                      className="form-input"
                      value={form.tags}
                      onChange={event => update('tags', event.target.value)}
                      placeholder="냉동,벌집,트렌드"
                      disabled={!canEdit}
                    />
                  </div>
                </Field>
              </section>

              <NotePhotoSection
                photos={form.photos || []}
                onChange={value => update('photos', value)}
              />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" type="button" onClick={closeWrite}>
                  취소
                </button>
                <button
                  className="btn primary"
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !canEdit}
                >
                  <Icon.check style={{ width: 14, height: 14 }} />
                  {saving ? '저장 중' : form.id ? '수정 저장' : '저장'}
                </button>
              </div>
          </div>
        </ModalFrame>
      )}

      {detailRow && (
        <MarketDetailModal
          row={detailRow}
          canEdit={canEdit}
          onClose={() => setDetailRow(null)}
          onEdit={() => {
            const row = detailRow;
            setDetailRow(null);
            startWrite(row);
          }}
          onPhotoClick={setLightboxPhoto}
        />
      )}

      <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </main>
  );
}
