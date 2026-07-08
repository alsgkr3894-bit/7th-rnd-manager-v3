'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { todayLocalDate } from '@/lib/date/local-date';
import {
  MARKET_RESEARCH_TYPES,
  deleteMarketResearch,
  getAllMarketResearch,
  saveMarketResearch,
} from '@/lib/note/market-research';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { NotePhotoSection } from '@/app/note/_NotePhotoSection';

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

export default function MarketResearchPage() {
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(() => withToday());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);

  const filtered = useMemo(() => rows.filter(row => includesQuery(row, query)), [rows, query]);

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

  function update(field, value) {
    if (!canEdit) return;
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function startWrite(row = null) {
    if (!canEdit) return;
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
          writing ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          ) : (
            <button
              className="btn primary"
              type="button"
              onClick={() => startWrite()}
              disabled={!canEdit}
            >
              <Icon.plus style={{ width: 14, height: 14 }} /> 작성하기
            </button>
          )
        }
      />

      {!canEdit && roleReady ? (
        <section className="card" style={{ marginTop: 18 }}>
          관리자만 시장조사를 작성할 수 있습니다.
        </section>
      ) : (
        <div className={'form-layout market-layout' + (writing ? ' is-writing' : '')}>
          <section className="card table-card market-list-card">
            <div className="market-list-toolbar">
              <div className="market-list-title">
                <div className="card-title">시장조사 목록</div>
                <div className="card-sub">총 {rows.length}건</div>
              </div>
              <button
                className="btn"
                type="button"
                onClick={() => startWrite()}
                disabled={!canEdit}
              >
                <Icon.plus style={{ width: 14, height: 14 }} /> 작성하기
              </button>
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
              {filtered.map(row => {
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
                          <img
                            key={index}
                            src={photo.data}
                            alt={photo.caption || photo.name || '시장조사 사진'}
                            style={{
                              width: 72,
                              height: 54,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              flex: '0 0 auto',
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button type="button" className="btn sm" onClick={() => startWrite(row)}>
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
          </section>

          {writing && (
            <div className="market-write-panel">
              <section className="card market-write-card">
                <div className="card-title">{form.id ? '시장조사 수정' : '시장조사 작성'}</div>
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
                      value={form.competitor}
                      onChange={event => update('competitor', event.target.value)}
                      placeholder="예: 피자, 냉동 토핑, 가성비"
                      disabled={!canEdit}
                    />
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
            </div>
          )}
        </div>
      )}
    </main>
  );
}
