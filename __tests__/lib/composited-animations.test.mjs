import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-09-29 성능 점검(Lighthouse "합성되지 않은 애니메이션"): 스켈레톤 shimmer가 background-position을
// 무한히 움직여 메인 스레드가 프레임마다 다시 그렸다. transform/opacity만 움직여야 GPU에서 처리된다.
const css = p =>
  readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
    .split('\r\n')
    .join('\n');

function keyframes(source, name) {
  const at = source.indexOf(`@keyframes ${name} {`);
  if (at === -1) throw new Error(`@keyframes ${name} 없음`);
  let depth = 0;
  for (let i = source.indexOf('{', at); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(at, i + 1);
  }
  throw new Error('닫히지 않음');
}

describe('합성되는 애니메이션만 쓴다', () => {
  const hero = css('app/styles/components/home-hero.css');
  const enhanced = css('app/styles/features/motion-enhanced.css');

  test('.skeleton의 빛줄기는 transform으로만 움직인다', () => {
    const block = keyframes(hero, 'shimmer-sweep');
    expect(block).toContain('transform: translateX(');
    for (const prop of ['background', 'width', 'left', 'margin']) expect(block).not.toContain(prop);
    expect(hero).toContain('animation: shimmer-sweep');
  });

  test('.skeleton 본체는 배경 위치·크기를 애니메이션하지 않는다', () => {
    for (const source of [hero, enhanced]) {
      const at = source.indexOf('.skeleton {');
      const body = source.slice(at, source.indexOf('}', at));
      expect(body).not.toContain('background-size');
      expect(body).not.toContain('animation');
    }
  });

  test('하단 탭 표시선은 width 대신 scaleX로 나타난다', () => {
    const block = keyframes(enhanced, 'tab-indicator');
    expect(block).not.toContain('width');
    expect(block).toContain('scaleX(');
  });
});
