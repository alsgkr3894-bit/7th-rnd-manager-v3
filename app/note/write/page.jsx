'use client';
import { PageHeader } from '@/components/ui/PageHeader';
import { StickySaveBar } from '@/components/ui/StickySaveBar';
import { NoteFormBody } from '@/app/note/_NoteFormBody';
import { SampleFormBody } from '@/app/note/sample/_SampleFormBody';
import { WriteTypeStep } from './_WriteTypeStep';
import { NoteWriteBanners } from './_NoteWriteBanners';
import { useNoteWriteController } from './useNoteWriteController';
import { isMenuWriteType } from './writeTypes';

export default function Page() {
  const {
    canEdit,
    writeType,
    form,
    sampleForm,
    saving,
    fromTitle,
    showDraftBanner,
    draftStatus,
    setLastCategory,
    handleFormChange,
    handleSampleFormChange,
    handleWriteTypeChange,
    handleSave,
    handleCancel,
    restoreDraft,
    dismissDraftBanner,
  } = useNoteWriteController();

  return (
    <main className="main" aria-busy={saving}>
      <PageHeader
        breadcrumb={['메뉴개발노트', '노트 작성']}
        title="노트 작성"
        sub={fromTitle ? `"${fromTitle}" 기반 새 버전` : '테스트 조건과 평가를 기록하세요'}
        actions={
          <span aria-live="polite" aria-atomic="true">
            {draftStatus === 'saving' && (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>임시저장 중…</span>
            )}
            {draftStatus === 'saved' && (
              <span
                style={{ fontSize: 12, color: 'var(--positive)', animation: 'fade 200ms ease' }}
              >
                ✓ 임시저장됨
              </span>
            )}
          </span>
        }
      />
      <WriteTypeStep value={writeType} onChange={handleWriteTypeChange} disabled={!canEdit} />
      <NoteWriteBanners
        fromTitle={fromTitle}
        canEdit={canEdit}
        showDraftBanner={showDraftBanner}
        onRestoreDraft={restoreDraft}
        onDismissDraftBanner={dismissDraftBanner}
      />
      {isMenuWriteType(writeType) ? (
        <NoteFormBody form={form} setForm={handleFormChange} onCategoryChange={setLastCategory} />
      ) : (
        <SampleFormBody
          form={sampleForm}
          setForm={handleSampleFormChange}
          readOnly={!canEdit}
          showRecordTypeField={false}
        />
      )}
      <StickySaveBar
        onCancel={handleCancel}
        onSave={handleSave}
        saving={saving}
        canSave={canEdit}
        saveLabel="저장하기"
      />
    </main>
  );
}
