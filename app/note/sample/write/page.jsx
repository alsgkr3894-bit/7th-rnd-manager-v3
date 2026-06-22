'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { addSample } from '@/lib/sample';
import { SampleFormBody, SAMPLE_INIT } from '../_SampleFormBody';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { consumeSampleFromNote } from '@/lib/note/keys';
import { todayLocalDate } from '@/lib/date/local-date';

export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [form, setForm] = useState(() => ({
    ...SAMPLE_INIT,
    testDate: todayLocalDate(),
  }));
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useBeforeUnload(isDirty);

  useEffect(() => {
    if (!roleReady) return;
    if (!canEdit) return;
    const d = consumeSampleFromNote();
    if (!d || typeof d !== 'object' || Array.isArray(d)) return;
    const menuName = typeof d.menuName === 'string' ? d.menuName : '';
    const category = typeof d.category === 'string' ? d.category : '';
    const tags = typeof d.tags === 'string' ? d.tags : '';
    const linkedNoteId = typeof d.noteId === 'number' ? d.noteId : null;
    setForm(f => ({
      ...f,
      sampleNames: menuName ? [menuName] : f.sampleNames,
      category: category || f.category,
      tags: tags || f.tags,
      ...(linkedNoteId != null && { linkedNoteId }),
    }));
  }, [canEdit, roleReady]);

  function handleFormChange(updater) {
    if (!canEdit) return;
    setForm(updater);
    setIsDirty(true);
  }

  useKeyboardSave(handleSave);

  async function handleSave() {
    if (!canEdit) return;
    if (saving) return; // Ctrl+S 연타 시 중복 저장 방지
    const names = (form.sampleNames || []).map(s => (s || '').trim()).filter(Boolean);
    if (!form.title.trim() || !names.length) {
      showToast('제목과 샘플명은 필수입니다', 'warn');
      return;
    }
    setSaving(true);
    try {
      await initDB();
      await addSample(form);
      setIsDirty(false);
      showToast('샘플이 저장됐어요', 'ok');
      router.replace('/note/sample');
    } catch {
      showToast('저장 중 오류가 발생했어요', 'error');
      setSaving(false);
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['샘플기록', '새 샘플 작성']}
        title="새 샘플 작성"
        sub="테스트 샘플을 사진과 함께 기록하세요"
        actions={
          <>
            <button className="btn" onClick={() => router.push('/note/sample')}>
              취소
            </button>
            <button className="btn primary" onClick={handleSave} disabled={saving || !canEdit}>
              {saving ? '저장 중…' : '저장하기'}
            </button>
          </>
        }
      />
      <SampleFormBody form={form} setForm={handleFormChange} readOnly={!canEdit} />
    </main>
  );
}
