import { deleteRecordsByField, goto, MAIN_DB, step } from '../helpers.mjs';

// 노트 작성 → 목록 반영 → 정리 (생성 흐름 + 크로스페이지)
export async function scenarioNoteCreate({ page, base, runId }) {
  const steps = [];
  const title = `E2E자동노트-${runId}`;
  const TITLE_PH = '예) 횡성한우 와사비마요 조합 테스트';
  const CONTENT_PH = '테스트 조건, 온도·시간·재료 비율, 핵심 변경사항 등을 기록하세요.';

  await step(steps, '노트 작성 페이지 진입', async () => {
    await goto(page, base, '/note/write');
    await page.getByPlaceholder(TITLE_PH).waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '필수 항목(제목·내용) 입력', async () => {
    await page.getByPlaceholder(TITLE_PH).fill(title);
    await page.getByPlaceholder(CONTENT_PH).fill('E2E 워크플로우 자동 검증용 노트');
  });

  await step(steps, '저장 → 목록으로 이동', async () => {
    await page.getByRole('button', { name: '저장하기' }).click();
    await page.waitForFunction(() => window.location.pathname === '/note', undefined, {
      timeout: 30_000,
    });
  });

  await step(steps, '작성한 노트가 목록에 표시', async () => {
    await page
      .getByText(title, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '테스트 노트 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_dev_notes', 'title', title);
  });

  return { name: '노트 작성 → 목록 반영', steps };
}

// 노트 일정 추가 → 캘린더 반영
export async function scenarioCalendarSchedule({ page, base, runId }) {
  const steps = [];
  const title = `E2E일정-${runId}`;
  const today = new Date().toISOString().slice(0, 10);

  await step(steps, '캘린더 페이지 진입 및 일정 DB 직접 삽입', async () => {
    await goto(page, base, '/note/calendar');
    await page.evaluate(
      ({ dbName, record }) =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('note_schedules')) {
              db.close();
              return reject(new Error('note_schedules store 없음'));
            }
            const tx = db.transaction('note_schedules', 'readwrite');
            tx.objectStore('note_schedules').add(record);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = e => {
              db.close();
              reject(new Error('삽입 실패: ' + e.target.error));
            };
          };
          req.onerror = () => reject(new Error('DB 열기 실패'));
        }),
      {
        dbName: MAIN_DB,
        record: {
          title,
          date: today,
          time: '',
          type: '기타',
          description: '',
          linkedNoteId: null,
          repeat: 'none',
          repeatUntil: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );
  });

  await step(steps, '캘린더 재진입 후 일정 표시 확인', async () => {
    await goto(page, base, '/note/calendar');
    await page
      .getByText(title, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '테스트 일정 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'note_schedules', 'title', title);
  });

  return { name: '노트 일정 추가 → 캘린더 반영', steps };
}
