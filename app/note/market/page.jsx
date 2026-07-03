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
};

function withToday(value = {}) {
  return { ...EMPTY_FORM, ...value, date: value.date || todayLocalDate() };
}

function includesQuery(row, query) {
  if (!query) return true;
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
  ]
    .join('\n')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
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

  const filtered = useMemo(
    () => rows.filter(row => includesQuery(row, query)),
    [rows, query]
  );

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

  function resetForm() {
    setForm(withToday());
  }

  async function handleSave() {
    if (!canEdit) {
      showToast('시장조사 저장은 관리자만 가능합니다', 'warn');
      return;
    }
    if (!form.title.trim() && !form.marketTrend.trim() && !form.referencePoint.trim()) {
      showToast('제목, 시장 트렌드, 참고 포인트 중 하나는 입력해주세요', 'warn');
      return;
    }
    setSaving(true);
    try {
      await saveMarketResearch(form);
      showToast(form.id ? '시장조사를 수정했습니다' : '시장조사를 저장했습니다', 'ok');
      resetForm();
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
      if (form.id === row.id) resetForm();
      await load();
    } catch (error) {
      console.error('[note/market] delete failed', error);
      showToast('삭제 실패', 'error');
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴개발노트', '시장조사']}
        title="시장조사"
        sub="경쟁사, 시장 흐름, 올해 트렌드, 타브랜드 참고 포인트를 기록합니다"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={resetForm} disabled={!canEdit}>
              새 기록
            </button>
            <button className="btn primary" type="button" onClick={handleSave} disabled={saving || !canEdit}>
              <Icon.check style={{ width: 14, height: 14 }} />
              {saving ? '저장 중…' : form.id ? '수정 저장' : '저장'}
            </button>
          </div>
        }
      />

      <div
        className="form-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 420px)',
          gap: 20,
          marginTop: 20,
          alignItems: 'start',
        }}
      >
        <section className="card" style={{ display: 'grid', gap: 14 }}>
          <div className="card-title">조사 내용</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
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
                placeholder="예) 냉동 버섯 토핑 경쟁사 적용 사례"
                disabled={!canEdit}
              />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="브랜드 / 출처">
              <input
                className="form-input"
                value={form.brand}
                onChange={event => update('brand', event.target.value)}
                placeholder="예) 경쟁사명, 기사, 리포트"
                disabled={!canEdit}
              />
            </Field>
            <Field label="경쟁사 / 시장 키워드">
              <input
                className="form-input"
                value={form.competitor}
                onChange={event => update('competitor', event.target.value)}
                placeholder="예) 도미노, 냉동 토핑, 가성비"
                disabled={!canEdit}
              />
            </Field>
          </div>
          <Field label="시장분석 / 올해 트렌드 방향성">
            <textarea
              className="form-input"
              value={form.marketTrend}
              onChange={event => update('marketTrend', event.target.value)}
              rows={5}
              placeholder="시장 흐름, 소비자 반응, 가격대, 올해 트렌드 방향을 적어주세요"
              disabled={!canEdit}
            />
          </Field>
          <Field label="타브랜드 참고 포인트">
            <textarea
              className="form-input"
              value={form.referencePoint}
              onChange={event => update('referencePoint', event.target.value)}
              rows={4}
              placeholder="벤치마킹할 조리법, 원재료, 패키지, 표현 방식"
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12 }}>
              <input
                className="form-input"
                value={form.actionIdea}
                onChange={event => update('actionIdea', event.target.value)}
                placeholder="예) 원물 비교 테스트 진행"
                disabled={!canEdit}
              />
              <input
                className="form-input"
                value={form.tags}
                onChange={event => update('tags', event.target.value)}
                placeholder="냉동,버섯,트렌드"
                disabled={!canEdit}
              />
            </div>
          </Field>
        </section>

        <aside className="card" style={{ position: 'sticky', top: 72 }}>
          <div className="card-title">기록 목록</div>
          <input
            className="form-input"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="키워드 검색"
            style={{ margin: '10px 0 12px' }}
          />
          <div style={{ display: 'grid', gap: 8 }}>
            {loading && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>불러오는 중…</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>저장된 시장조사가 없습니다</div>
            )}
            {filtered.map(row => (
              <article
                key={row.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 10,
                  background: form.id === row.id ? 'var(--accent-soft)' : 'var(--surface-2)',
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, minWidth: 0, flex: 1 }}>{row.title || row.type}</strong>
                  <span className="chip">{row.type}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  {row.date || '날짜 없음'} {row.brand ? `· ${row.brand}` : ''}
                </div>
                <p
                  style={{
                    margin: '7px 0 0',
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'var(--text-2)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {row.marketTrend || row.referencePoint || row.developmentDirection || '내용 없음'}
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => setForm(withToday(row))}
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
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
