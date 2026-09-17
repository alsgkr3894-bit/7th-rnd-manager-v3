import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

// 시장조사 페이지는 상세 모달·사진 라이트박스·그룹핑/검색 헬퍼가 한 파일(762줄)에
// 인라인돼 있었다. 1차로 역할별로 나눴고(510줄), 2차로 목록 카드·작성 모달·
// 데이터/폼 훅까지 분리해 page는 조립만 담당한다.
describe('시장조사 페이지 파일 분리', () => {
  test('page.jsx는 200줄을 넘지 않고 분리된 구현을 다시 품지 않는다', () => {
    const page = src('app/note/market/page.jsx');
    expect(page.split('\n').length).toBeLessThanOrEqual(200);
    expect(page).not.toContain('function MarketDetailModal');
    expect(page).not.toContain('function PhotoLightbox');
    expect(page).not.toContain('function groupByCompetitor');
    expect(page).not.toContain('function includesQuery');
    // 2차 분리: 데이터 로드/저장 호출과 폼 상태는 훅으로, 목록/작성 UI는 컴포넌트로 나갔다.
    expect(page).not.toContain('getAllMarketResearch');
    expect(page).not.toContain('saveMarketResearch');
    expect(page).not.toContain('deleteMarketResearch');
    expect(page).not.toContain('market-list-stack');
    expect(page).not.toContain('<ModalFrame');
    expect(page).toContain("from './useMarketResearchList'");
    expect(page).toContain("from './useMarketWriteForm'");
    expect(page).toContain("from './_MarketListPanel'");
    expect(page).toContain("from './_MarketWriteModal'");
  });

  test('그룹핑·검색·폼 기본값은 marketUtils.js가 갖는다', () => {
    const utils = src('app/note/market/marketUtils.js');
    expect(utils).toContain('export function groupByCompetitor');
    expect(utils).toContain('export function colorForCompetitor');
    expect(utils).toContain('export function includesQuery');
    expect(utils).toContain('export function hasFormContent');
    expect(utils).toContain('export const EMPTY_FORM');
  });

  test('목록 로드·검색 파생과 폼 상태·저장/삭제 액션은 각자 훅이다', () => {
    const list = src('app/note/market/useMarketResearchList.js');
    expect(list).toContain('export function useMarketResearchList');
    expect(list).toContain('await getAllMarketResearch()');
    expect(list).toContain('groupByCompetitor(filtered)');
    const write = src('app/note/market/useMarketWriteForm.js');
    expect(write).toContain('export function useMarketWriteForm');
    expect(write).toContain('const [writing, setWriting] = useState(false)');
    expect(write).toContain('await saveMarketResearch(form)');
    expect(write).toContain('await deleteMarketResearch(row.id)');
    // ?edit=<id> 자동 열기 — 같은 id로 두 번 열지 않도록 ref 가드를 유지한다.
    expect(write).toContain('appliedEditIdRef');
  });

  test('상세 모달·라이트박스·라벨 필드·목록·작성 모달은 각자 파일이다', () => {
    expect(src('app/note/market/_MarketDetailModal.jsx')).toContain(
      'export function MarketDetailModal'
    );
    expect(src('app/note/market/_MarketPhotoLightbox.jsx')).toContain(
      'export function MarketPhotoLightbox'
    );
    expect(src('app/note/market/_MarketListPanel.jsx')).toContain(
      'export function MarketListPanel'
    );
    expect(src('app/note/market/_MarketRecordCard.jsx')).toContain(
      'export function MarketRecordCard'
    );
    const writeModal = src('app/note/market/_MarketWriteModal.jsx');
    expect(writeModal).toContain('export function MarketWriteModal');
    expect(writeModal).toContain('<NotePhotoSection');
    expect(writeModal).toContain("onChange={value => update('photos', value)}");
    const fields = src('app/note/market/_MarketFields.jsx');
    expect(fields).toContain('export function Field');
    expect(fields).toContain('export function DetailField');
    // 라벨 필드는 작성 모달과 상세 모달이 함께 쓴다 — 각자 복제하지 않는다.
    expect(writeModal).toContain("from './_MarketFields'");
    expect(src('app/note/market/_MarketDetailModal.jsx')).toContain("from './_MarketFields'");
  });

  test('분리된 파일은 각자 150줄을 넘지 않는다', () => {
    const files = [
      'app/note/market/marketUtils.js',
      'app/note/market/marketPageUtils.js',
      'app/note/market/useMarketResearchList.js',
      'app/note/market/useMarketWriteForm.js',
      'app/note/market/_MarketDetailModal.jsx',
      'app/note/market/_MarketPhotoLightbox.jsx',
      'app/note/market/_MarketFields.jsx',
      'app/note/market/_MarketListPanel.jsx',
      'app/note/market/_MarketRecordCard.jsx',
      'app/note/market/_MarketWriteModal.jsx',
    ];
    for (const file of files) {
      expect(src(file).split('\n').length).toBeLessThanOrEqual(150);
    }
  });
});
