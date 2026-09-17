'use client';

import { ModalFrame } from '@/components/ui/ModalFrame';
import { StickySaveBar } from '@/components/ui/StickySaveBar';
import { MARKET_RESEARCH_TYPES } from '@/lib/note/market-research';
import { NotePhotoSection } from '@/app/note/_NotePhotoSection';
import { Field } from './_MarketFields';

/** 시장조사 작성/수정 모달 — 유형 선택, 기본/본문 필드, 사진, 저장 바. */
export function MarketWriteModal({
  form,
  canEdit,
  saving,
  competitorOptions,
  onUpdate: update,
  onClose,
  onSave,
}) {
  return (
    <ModalFrame
      title={form.id ? '시장조사 수정' : '시장조사 작성'}
      onClose={onClose}
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
        <NotePhotoSection photos={form.photos || []} onChange={value => update('photos', value)} />

        <StickySaveBar
          onCancel={onClose}
          onSave={onSave}
          saving={saving}
          canSave={canEdit}
          savingLabel="저장 중"
          saveLabel={form.id ? '수정 저장' : '저장'}
        />
      </div>
    </ModalFrame>
  );
}
