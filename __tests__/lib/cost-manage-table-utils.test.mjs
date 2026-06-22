import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  inlineEditErrorMessage,
  normalizeInlineEditDraft,
} from '@/components/cost/manage/inline-edit-utils';

const tableUtilsSource = readFileSync(resolve('components/cost/manage/table-utils.js'), 'utf8');

describe('cost manage table utils', () => {
  test('normalizeInlineEditDraft는 숫자 셀의 잘못된 입력 저장을 막는다', () => {
    expect(normalizeInlineEditDraft('12,300', 'number')).toEqual({ ok: true, value: 12300 });
    expect(normalizeInlineEditDraft('-10', 'number')).toEqual({ ok: true, value: -10 });
    expect(normalizeInlineEditDraft('', 'number')).toEqual({ ok: true, value: null });
    expect(normalizeInlineEditDraft('Infinity', 'number')).toEqual({ ok: false, value: null });
    expect(normalizeInlineEditDraft('abc', 'number')).toEqual({ ok: false, value: null });
  });

  test('normalizeInlineEditDraft는 nonNegative 숫자 셀의 음수 저장을 막는다', () => {
    expect(normalizeInlineEditDraft('12,300', 'number', { nonNegative: true })).toEqual({
      ok: true,
      value: 12300,
    });
    expect(normalizeInlineEditDraft('-10', 'number', { nonNegative: true })).toEqual({
      ok: false,
      value: null,
    });
  });

  test('normalizeInlineEditDraft는 텍스트 셀을 trim한다', () => {
    expect(normalizeInlineEditDraft('  피자  ', 'text')).toEqual({ ok: true, value: '피자' });
  });

  test('inlineEditErrorMessage는 숫자/필수 오류를 사용자에게 설명한다', () => {
    expect(inlineEditErrorMessage({ type: 'number' })).toBe('숫자만 입력하세요');
    expect(inlineEditErrorMessage({ type: 'number', nonNegative: true })).toBe(
      '0 이상의 숫자만 입력하세요'
    );
    expect(inlineEditErrorMessage({ required: true })).toBe('필수 입력입니다');
  });

  test('InlineEditCell은 잘못된 입력을 조용히 무시하지 않고 셀 안에 오류를 표시한다', () => {
    expect(tableUtilsSource).toContain('aria-invalid');
    expect(tableUtilsSource).toContain('aria-describedby');
    expect(tableUtilsSource).toContain('inlineEditErrorMessage({ type, nonNegative })');
    expect(tableUtilsSource).toContain('inlineEditErrorMessage({ required: true })');
  });
});
