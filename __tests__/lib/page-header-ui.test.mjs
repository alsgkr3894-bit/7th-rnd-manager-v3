import { describe, expect, test } from '@jest/globals';
import {
  getBreadcrumbKey,
  getFilterChipKey,
  normalizeBreadcrumbs,
  normalizeFilterChips,
  normalizePageText,
} from '../../lib/ui/page-header.js';

describe('page header ui helpers', () => {
  test('페이지 텍스트는 표시 가능한 값만 문자열로 보정한다', () => {
    expect(normalizePageText('설정')).toBe('설정');
    expect(normalizePageText(2026)).toBe('2026');
    expect(normalizePageText(null, '대체')).toBe('대체');
    expect(normalizePageText({ label: 'bad' })).toBe('');
  });

  test('breadcrumb는 문자열과 label 객체만 보존하고 href는 문자열만 허용한다', () => {
    expect(normalizeBreadcrumbs([
      '홈',
      { label: '설정', href: '/settings' },
      { label: '복원', href: 7 },
      { href: '/empty' },
      null,
    ])).toEqual([
      { label: '홈', href: null },
      { label: '설정', href: '/settings' },
      { label: '복원', href: null },
    ]);
  });

  test('filter chip은 빈 항목과 잘못된 onClick을 제거한다', () => {
    const handler = () => 'ok';

    expect(normalizeFilterChips([
      { label: '전체', count: 0, active: true, onClick: handler },
      { label: '누락', count: '12', onClick: 'bad' },
      { label: '', count: null },
      null,
    ])).toEqual([
      { label: '전체', count: '0', active: true, onClick: handler },
      { label: '누락', count: '12', active: false, onClick: undefined },
    ]);
  });

  test('key helper는 기존 라벨 기반 키 형식을 유지한다', () => {
    expect(getBreadcrumbKey({ label: '설정' }, 1)).toBe('설정-1');
    expect(getFilterChipKey({ label: '' }, 2)).toBe('chip-2');
  });
});
