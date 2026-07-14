# 제때(Jette) 엑셀 자동 다운로더

제때 발주 시스템(`ebiz.jette.co.kr`)에서 **단가/출고량 엑셀을 자동으로 내려받아**, 이 앱의
제때 업로드 화면(`/jette/price-compare`, `/jette/shipment`)에 올리는 작업을 반자동화합니다.

> 제때는 로그인이 필요하고 로그인 시 **인증번호(authNum)** 를 요구할 수 있어, 완전 무인 로그인은
> 보장되지 않습니다. 그래서 **최초 1회는 직접 로그인 → 세션 저장**, 이후에는 저장된 세션으로
> 무인 다운로드하는 구조입니다. 세션이 만료되면 `login` 을 다시 실행하세요.

## 현재 상태 (2026-07-10)

- ✅ **단가(price)**: 검증 완료. `주문입력(NEW)` 화면(CS06290)에서 거래처=`7번가피자 본사`
  선택 → 조회 → 엑셀다운. `jette.config.json` 의 `reports.price.steps` 에 흐름이 이미 설정돼 있음.
  `npm run jette:login` 으로 세션만 잡으면 `npm run jette:download -- price` 로 바로 받아짐.
- ⏸️ **출고량(shipment)**: 보류. 메뉴/기간이 정해지면 `reports.shipment` 에 steps 를 채우면 됨.
- ✅ **자동 스케줄**: Windows 작업 스케줄러에 `Jette단가자동다운로드` 작업 등록됨 — 매일 오전 9시
  `scripts/jette/scheduled-download.ps1` 실행 → `download price`. 로그는
  `scripts/jette/logs/price-download.log` 에 누적 기록(성공/실패 모두). 세션 만료로 실패하면
  로그에 안내가 남으니, 그럴 땐 `npm run jette:login` 재실행.

### 스케줄 관리

```powershell
Get-ScheduledTask -TaskName "Jette단가자동다운로드"           # 상태 확인
Get-ScheduledTaskInfo -TaskName "Jette단가자동다운로드"       # 다음/마지막 실행 시각
Start-ScheduledTask -TaskName "Jette단가자동다운로드"         # 지금 바로 1회 실행(테스트)
Disable-ScheduledTask -TaskName "Jette단가자동다운로드"       # 잠시 끄기
Unregister-ScheduledTask -TaskName "Jette단가자동다운로드" -Confirm:$false  # 완전 삭제
```

## 1. 준비 (최초 1회)

```bash
# config 생성 (자격증명·세션·다운로드 파일은 .gitignore 처리됨)
cp scripts/jette/jette.config.example.json scripts/jette/jette.config.json
```

`jette.config.json` 을 열어 최소한 자격증명을 채웁니다:

```json
{
  "credentials": { "userId": "아이디", "password": "비밀번호" }
}
```

## 2. 로그인 → 세션 저장

```bash
npm run jette:login
```

브라우저가 뜨면 (아이디/비번은 자동 입력됨) **인증번호가 있으면 입력**하고 로그인 → 홈 화면이
보이면 터미널로 돌아와 **Enter**. `scripts/jette/.jette-session.json` 에 세션이 저장됩니다.

## 3. 다운로드 버튼 찾기 (리포트별 최초 1회)

단가/출고량 리포트 페이지의 URL과 "엑셀 다운로드" 버튼 selector를 config에 넣어야 합니다.
페이지에서 자동으로 후보를 찾아줍니다:

```bash
npm run jette:inspect -- "https://ebiz.jette.co.kr/<단가 리포트 경로>"
```

출력된 `selector` 와 페이지 `url` 을 `jette.config.json` 의 `reports.price` / `reports.shipment` 에 채웁니다:

```json
"reports": {
  "price":    { "label": "제때 단가",  "url": "https://ebiz.jette.co.kr/...", "trigger": "#btnExcel" },
  "shipment": { "label": "제때 출고량", "url": "https://ebiz.jette.co.kr/...", "trigger": "text=엑셀 다운로드" }
}
```

`trigger` 는 CSS selector(`#btnExcel`, `.excel-btn`) 또는 Playwright 텍스트 selector(`text=엑셀 다운로드`)를 씁니다.

## 4. 다운로드

```bash
npm run jette:download            # 전체(all)
npm run jette:download -- price   # 단가만
npm run jette:download -- shipment
```

내려받은 파일은 `.jette-downloads/price/` , `.jette-downloads/shipment/` 에
`날짜-원본파일명.xlsx` 형태로 저장됩니다.

## 5. 앱에 업로드

- 단가:  앱의 **`/jette/price-compare`** 업로드 화면에 내려받은 xlsx 를 올리세요.
- 출고량: 앱의 **`/jette/shipment`** 업로드 화면에 올리세요.

파서(`lib/price/parse.js`, `lib/shipment/parse.js`)가 헤더를 자동 인식하므로 제때 원본 엑셀을
그대로 올리면 됩니다.

## steps DSL (다단계 흐름 설정)

제때 화면은 Infragistics 기반 SPA라 "URL 열고 버튼 하나 클릭"으로 안 되는 경우가 많습니다.
그래서 `reports.<key>.steps` 배열로 흐름을 표현합니다. 각 step 후 로딩 막(`.ui-widget-overlay`,
`#pageIndicator`)이 사라질 때까지 자동으로 기다립니다.

| step | 설명 |
| --- | --- |
| `{ "do": "goto", "url": "...", "ms": 4000 }` | 페이지 이동 후 ms 대기 |
| `{ "do": "wait", "ms": 3000 }` | 고정 대기 |
| `{ "do": "openCombo", "nth": 0 }` | nth번째 igCombo(거래처=0, 대분류=1, 중분류=2) 드롭다운 열기 |
| `{ "do": "pickItem", "text": "7번가피자 본사" }` | 드롭다운 `<li>` 중 정확히 일치하는 항목 선택 |
| `{ "do": "click", "selector": "#btnXxx" }` | JS 직접 클릭(오버레이 우회, 읽기 전용 동작에만 사용) |
| `{ "do": "fill", "selector": "#txtDate", "value": "2026-06-01" }` | 입력값 채우기 |
| `{ "do": "download", "selector": "#btnXxxExcelDown" }` | 엑셀 버튼 클릭 + 다운로드 캡처 (마지막 step) |

> ⚠️ 이 화면들은 **실제 발주(주문) 시스템**입니다. `조회`·`엑셀다운` 같은 **읽기 전용** 버튼만
> 쓰고, `장바구니담기`·`주문하기` 등 side-effect 버튼은 절대 step 에 넣지 마세요.

새 리포트의 selector 는 `npm run jette:inspect -- "<url>"` 로 후보를 찾거나, 개발자도구로 확인합니다.

## 옵션

- `--headed` : `download`/`inspect` 시 브라우저를 표시 (디버깅용)
- `--config <path>` : config 파일 경로 지정

## 문제 해결

- **LogOn 으로 리다이렉트** → 세션 만료. `npm run jette:login` 재실행.
- **다운로드 버튼을 못 찾음** → `--headed` 로 확인하거나 `inspect` 후보 재확인.
- **인증번호 때문에 자동화가 어려움** → login 단계는 원래 수동이므로 정상. 세션만 유지되면 download는 무인.
