# v2 정책/문서 참고 자료 (Reference)

`/Users/lmh/Documents/Codex/7th-rnd-manager-v2`에서 가져온 스냅샷 (2026-05-24 시점).

**용도**: v3 작업 시 정책/규칙/이력 참고용. **v3에 자동 적용되는 게 아님**, 필요한 부분만 골라 사용.

---

## 핵심 정책 (Active Policies)

v2 운영 중인 정책. v3에서도 대부분 유지해야 함.

| 파일 | 내용 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | 메인 개발 정책 (메뉴 구조, 코드 규칙, UI 원칙, 데이터 저장, 향후 기능 등 통합) |
| [MENU_SALES_DETAILED_POLICY.md](./MENU_SALES_DETAILED_POLICY.md) | 메뉴판매량 모듈 상세 정책 (분류 규칙, 카테고리 매핑, 특수 케이스 등) |
| [docs/menu-sales/MS_MASTER_SPEC.md](./docs/menu-sales/MS_MASTER_SPEC.md) | 메뉴판매량 마스터 스펙 |
| [CHANGELOG.md](./CHANGELOG.md) | v2.0.0 안정화 완료 시점까지의 변경 이력 |

---

## 마일스톤 리뷰 (Milestone Reviews)

각 마일스톤의 설계/검토/완료 보고서. 결정 배경 참고용.

### MS0 — 초기 설계
- [MS0_DESIGN_ANALYSIS.md](./MS0_DESIGN_ANALYSIS.md)

### MS6 — 미매칭 이슈 처리
- [MS6_SUPPLEMENT_TEST_REPORT.md](./MS6_SUPPLEMENT_TEST_REPORT.md)

### MS7 — 안정성 강화
- [MS7_MENU_SALES_SETTINGS_DESIGN_REVIEW.md](./MS7_MENU_SALES_SETTINGS_DESIGN_REVIEW.md)
- [MS7_STABILITY_ENHANCEMENT_REPORT.md](./MS7_STABILITY_ENHANCEMENT_REPORT.md)

### MS8 — 월별 데이터 관리 고도화
- [MS8_DESIGN_REVIEW.md](./MS8_DESIGN_REVIEW.md)
- [MS8_STEP1_TEST_REPORT.md](./MS8_STEP1_TEST_REPORT.md)
- [MS8_STEP3_DESIGN_REVIEW.md](./MS8_STEP3_DESIGN_REVIEW.md)
- [MS8_STEP3_DESIGN_REVISED.md](./MS8_STEP3_DESIGN_REVISED.md)

### Step 3 시리즈
- [STEP3_FINAL_REPORT.md](./STEP3_FINAL_REPORT.md)
- [STEP3_IMPLEMENTATION_SUMMARY.md](./STEP3_IMPLEMENTATION_SUMMARY.md)
- [STEP3_STATUS.md](./STEP3_STATUS.md)
- [STEP3_VERIFICATION_GUIDE.md](./STEP3_VERIFICATION_GUIDE.md)
- [STEP3_VERIFICATION_QUICK.md](./STEP3_VERIFICATION_QUICK.md)

---

## 기타

| 파일 | 내용 |
|------|------|
| [ICON_AUDIT_REPORT.md](./ICON_AUDIT_REPORT.md) | UI 아이콘 통일화 조사 (Lucide Icons, SVG 스프라이트) |
| [NEXT_TASKS.md](./NEXT_TASKS.md) | v2 시점의 다음 작업 후보 |
| [README.md](./README.md) | 거의 비어있음 |

---

## v3 작업 시 우선 참고 순서

1. **CLAUDE.md** — 가장 중요. 개발 원칙·메뉴 구조·코드 규칙·향후 기능 예정안까지 통합
2. **MENU_SALES_DETAILED_POLICY.md** — 메뉴판매량 분류 규칙
3. **CHANGELOG.md** — v2가 어떤 상태인지 한눈에 파악
4. 그 외 MS/STEP 문서들은 해당 기능 다룰 때만

---

## 주의

- 이 폴더는 **읽기 전용 참고용 스냅샷**. v3 작업 결과로 자동 갱신되지 않음.
- v3에서 정책이 바뀌면 v3 자체의 `CLAUDE.md` 또는 `docs/` 만들어 거기에 기록.
- v2 정책 그대로 가져갈 부분은 복사/수정해서 v3 루트로 옮겨 사용.
