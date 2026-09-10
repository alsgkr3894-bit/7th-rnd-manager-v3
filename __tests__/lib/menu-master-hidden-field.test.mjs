import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

/**
 * 메뉴마스터 "숨김" 필드(단종과 별개, 목록에서 완전 감춤) 배선 확인.
 * hidden 필드 자체는 lib/menu-master/store.js에 이미 있었다 — 이 테스트는
 * 그걸 실제로 토글하고, 목록/통계에서 제외하는 배선이 갖춰졌는지 본다.
 */
describe('메뉴마스터 숨김 필드', () => {
  test('useMenuMasterFilters는 showHidden 기본값 false로 hidden 행을 제외한다', () => {
    const s = src('hooks/useMenuMasterFilters.js');
    expect(s).toContain('useState(false)');
    expect(s).toContain('r.hidden');
    expect(s).toContain('showHidden ? rows : rows.filter(r => !r.hidden)');
    expect(s).toContain('hiddenCount');
    expect(s).toContain('visibleRows');
  });

  test('메뉴마스터 페이지는 상태 통계·필터 탭 계산에 visibleRows를 쓴다', () => {
    const s = src('app/menu-master/page.jsx');
    expect(s).toContain('visibleRows.filter(r => r.status');
    expect(s).toContain('showHidden');
    expect(s).toContain('setShowHidden');
    expect(s).toContain('hiddenCount');
  });

  test('필터 패널에 숨김 개수 토글 버튼이 있다', () => {
    const s = src('components/menu-master/MenuMasterFilterPanel.jsx');
    expect(s).toContain('onToggleShowHidden');
    expect(s).toContain('숨김');
  });

  test('수정 모달에 HiddenField가 연결돼 있고 저장 payload에 hidden을 포함한다', () => {
    const fields = src('components/menu-master/MenuMasterEditFields.jsx');
    expect(fields).toContain('HiddenField');
    expect(fields).toContain("from '@/components/menu-master/MenuMasterCommercialFields'");

    const modal = src('components/menu-master/MenuMasterEditModal.jsx');
    expect(modal).toContain("hidden: row?.hidden === true");
    expect(modal).toContain('hidden: form.hidden');
  });

  test('HiddenField는 단종(status)과 별개로 hidden 필드만 토글한다', () => {
    const s = src('components/menu-master/MenuMasterCommercialFields.jsx');
    expect(s).toContain('export function HiddenField');
    expect(s).toContain("setField('hidden', e.target.checked)");
  });
});
