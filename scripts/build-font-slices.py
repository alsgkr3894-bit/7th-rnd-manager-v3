"""
scripts/build-font-slices.py — Pretendard Variable(2MB)를 글자 조각(unicode-range)으로 나눈다.

전체 폰트(한글 11,172자)를 한 파일로 서빙하면 첫 화면에도 2MB를 받는다. 이 스크립트는
  latin  : 화면에 흔히 나오는 비한글 — 기본 라틴·라틴-1·문장부호·화살표·도형·기호·한글 자모·전각
  ext    : 나머지 비한글(키릴·그리스·베트남어 확장 등) — 거의 안 쓰이므로 필요할 때만 받는다
  h1     : 소스 코드(app·components·lib·hooks·prisma)에 실제로 쓰인 한글 음절 — 첫 화면에 필요한 글자
  h2     : KS X 1001 한글 2,350자 중 h1에 없는 것 — 메뉴명·식자재명 같은 입력 데이터의 대부분
  h3~h6  : 나머지 음절을 코드 순서로 4등분 — '쌤'처럼 드문 글자가 있을 때만 받는다
으로 나눠 app/fonts/에 woff2로 쓰고, unicode-range를 담은 app/fonts/pretendard.css를 함께 만든다
(app/layout.jsx가 import — Next가 파일 이름에 해시를 붙여 오래 캐시되게 서빙한다).
글자는 하나도 버리지 않는다(11,172자 전부 어느 한 조각에 들어 있다) — KS X 1001만 남기면 '쌤' 같은
글자가 깨진다.

의존성은 프로젝트에 넣지 않았다. 다시 만들 때만 임시로 설치한다:
  python -m pip install --target <임시폴더> fonttools brotli
  PYTHONPATH=<임시폴더> python scripts/build-font-slices.py
원본은 fonts-src/PretendardVariable.woff2(서빙되지 않음).
"""
import os
import subprocess
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

SRC = 'fonts-src/PretendardVariable.woff2'
OUT_DIR = 'app/fonts'
SOURCE_DIRS = ['app', 'components', 'lib', 'hooks', 'prisma']
SOURCE_EXT = ('.js', '.jsx', '.mjs', '.ts', '.tsx', '.json', '.css')
HANGUL = range(0xAC00, 0xD7A4)
# 기본 조각에 넣는 비한글 구간(나머지는 ext) — 숫자·₩·%·화살표·체크·도형·별·전각까지 UI에서 쓴다
CORE_RANGES = [
    (0x0020, 0x007E), (0x00A0, 0x00FF), (0x2000, 0x206F), (0x20A0, 0x20BF),
    (0x2100, 0x218F), (0x2190, 0x21FF), (0x2200, 0x22FF), (0x2460, 0x24FF),
    (0x25A0, 0x25FF), (0x2600, 0x26FF), (0x2700, 0x27BF), (0x3000, 0x303F),
    (0x3130, 0x318F), (0x3200, 0x321F), (0xFF00, 0xFFEF),
]


def ks_x_1001_hangul():
    out = set()
    for lead in range(0xB0, 0xC9):
        for trail in range(0xA1, 0xFF):
            try:
                ch = bytes([lead, trail]).decode('cp949')
            except UnicodeDecodeError:
                continue
            if 0xAC00 <= ord(ch) <= 0xD7A3:
                out.add(ord(ch))
    return out


def source_hangul():
    files = subprocess.check_output(['git', 'ls-files', *SOURCE_DIRS], text=True, encoding='utf-8').split('\n')
    out = set()
    for path in files:
        if not path.endswith(SOURCE_EXT) or not os.path.isfile(path):
            continue
        with open(path, encoding='utf-8', errors='ignore') as fh:
            for ch in fh.read():
                if 0xAC00 <= ord(ch) <= 0xD7A3:
                    out.add(ord(ch))
    return out


def to_ranges(codes):
    codes = sorted(codes)
    parts, start, prev = [], None, None
    for c in codes:
        if start is None:
            start = prev = c
        elif c == prev + 1:
            prev = c
        else:
            parts.append((start, prev))
            start = prev = c
    if start is not None:
        parts.append((start, prev))
    return ','.join('U+%X' % a if a == b else 'U+%X-%X' % (a, b) for a, b in parts)


def write_slice(font_path, name, codes):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*'] if name == 'latin' else ['kern', 'ccmp', 'locl', 'calt', 'liga', 'clig']
    if name == 'ext':
        opts.layout_features = ['kern', 'ccmp', 'locl']
    opts.notdef_outline = True
    opts.name_IDs = [1, 2, 3, 4, 6]
    opts.hinting = False
    font = subset.load_font(font_path, opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=sorted(codes))
    sub.subset(font)
    dest = os.path.join(OUT_DIR, 'pretendard-%s.woff2' % name)
    subset.save_font(font, dest, opts)
    return os.path.getsize(dest)


def write_css(manifest):
    lines = ['/* scripts/build-font-slices.py가 만든 파일 — 직접 고치지 말고 스크립트를 다시 돌린다. */']
    for name, m in manifest.items():
        lines += [
            '@font-face {',
            "  font-family: 'Pretendard Slice';",
            '  font-style: normal;',
            '  font-weight: 100 900;',
            '  font-display: swap;',
            "  src: url('./pretendard-%s.woff2') format('woff2');" % name,
            '  unicode-range: %s;' % m['range'],
            '}',
        ]
    lines += [':root {', "  --font-pretendard: 'Pretendard Slice';", '}']
    nl = chr(10)
    with open(os.path.join(OUT_DIR, 'pretendard.css'), 'w', encoding='utf-8', newline=nl) as fh:
        fh.write(nl.join(lines) + nl)


def main():
    font = TTFont(SRC)
    cmap = set(font.getBestCmap())
    all_hangul = {c for c in HANGUL if c in cmap}
    assert len(all_hangul) == 11172, len(all_hangul)

    h1 = source_hangul() & all_hangul
    h2 = (ks_x_1001_hangul() & all_hangul) - h1
    rest = sorted(all_hangul - h1 - h2)
    size = -(-len(rest) // 4)
    chunks = [set(rest[i * size:(i + 1) * size]) for i in range(4)]

    non_hangul = cmap - all_hangul
    core = {c for c in non_hangul if any(a <= c <= b for a, b in CORE_RANGES)}
    slices = {'latin': core, 'ext': non_hangul - core, 'h1': h1, 'h2': h2}
    for i, chunk in enumerate(chunks):
        slices['h%d' % (i + 3)] = chunk

    # 검증: 모든 글자가 정확히 한 조각에 들어 있다
    seen = set()
    for codes in slices.values():
        assert not (seen & codes)
        seen |= codes
    assert seen == cmap, (len(seen), len(cmap))

    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = {}
    for name, codes in slices.items():
        nbytes = write_slice(SRC, name, codes)
        manifest[name] = {'range': to_ranges(codes), 'chars': len(codes), 'bytes': nbytes}
        print('%-6s %6d자 %8d bytes' % (name, len(codes), nbytes))
    write_css(manifest)
    print('합계', sum(m['bytes'] for m in manifest.values()), 'bytes')


if __name__ == '__main__':
    sys.exit(main())
