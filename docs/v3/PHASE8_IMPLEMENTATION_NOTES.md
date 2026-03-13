# Phase 8 Implementation Notes

## 아키텍처 요약

Phase 8은 Phase 7의 백엔드 인텔리전스 파이프라인을 실제 사용자 화면으로 번역한다.
핵심 원칙: **Mock 데이터 없이, 빈 상태는 구조 미리보기로, 실 데이터 연결은 tRPC를 통해**.

---

## 변경된 파일 목록

### 신규 생성 (7개)

| 파일                                                 | 설명                        |
| ---------------------------------------------------- | --------------------------- |
| `apps/web/src/app/(dashboard)/start/page.tsx`        | 시작 허브 (3가지 분석 경로) |
| `apps/web/src/app/(dashboard)/intent/page.tsx`       | 검색 의도 분석              |
| `apps/web/src/app/(dashboard)/geo-aeo/page.tsx`      | GEO/AEO 최적화              |
| `apps/web/src/app/(dashboard)/comments/faq/page.tsx` | FAQ & 이슈 관리             |
| `apps/web/src/app/(dashboard)/campaigns/page.tsx`    | 캠페인 실행                 |
| `docs/v3/UX_UI_INTEGRATION_STATUS.md`                | UX/UI 통합 현황 문서        |
| `docs/v3/DASHBOARD_INFORMATION_ARCHITECTURE.md`      | 대시보드 IA 문서            |
| `docs/v3/SCREEN_FLOW_AND_ENTRY_MAP.md`               | 화면 흐름 문서              |

### 전면 리디자인 (4개)

| 파일                                                        | 변경 내용                                 |
| ----------------------------------------------------------- | ----------------------------------------- |
| `apps/web/src/lib/constants.ts`                             | Feature-centric → Insight-flow 네비게이션 |
| `apps/web/src/app/(dashboard)/dashboard/dashboard-view.tsx` | 인사이트 중심 대시보드                    |
| `apps/web/src/app/(dashboard)/insights/page.tsx`            | 3탭 구조, Mock 데이터 제거                |
| `apps/web/src/app/(dashboard)/admin/collection/page.tsx`    | 운영 모니터링 구조                        |

### i18n 업데이트 (2개)

| 파일                            | 변경 내용                   |
| ------------------------------- | --------------------------- |
| `apps/web/src/messages/ko.json` | 네비게이션 8개 그룹 키 추가 |
| `apps/web/src/messages/en.json` | 동일 구조 영문 키 추가      |

---

## 의존성 그래프

```
constants.ts (네비게이션 구조)
    → Layout sidebar 렌더링
    → 모든 페이지 라우팅

dashboard-view.tsx
    → tRPC dashboard.overview (기존)
    → InsightGenerationService (Phase 9 tRPC 연결)
    → ActionRecommendationOrchestrator (Phase 9 tRPC 연결)

insights/page.tsx
    → InsightGenerationService (Phase 9 tRPC)
    → ActionRecommendationOrchestrator (Phase 9 tRPC)
    → EvidenceBundleService (Phase 9 tRPC)

intent/page.tsx → IntentAnalysisService (Phase 9 tRPC)
geo-aeo/page.tsx → GeoAeoScorer (Phase 9 tRPC)
comments/faq/page.tsx → FaqCandidateRepository, RiskSignalRepository (Phase 9 tRPC)
campaigns/page.tsx → ActionRecommendationOrchestrator (Phase 9 tRPC)
admin/collection/page.tsx → ScheduledJob, PipelineStatus (Phase 9 tRPC)
```

---

## TypeScript 컴파일 상태

- Phase 8 신규/수정 파일: **0 에러**
- 기존 에러: `@x2/social` 패키지 (Instagram/TikTok) — Phase 8 무관

---

## 설계 결정 기록

### 1. Mock 데이터 대신 빈 상태 구조

- **결정**: 모든 신규 페이지에서 mock/hardcoded 데이터를 기본 표시하지 않음
- **이유**: "화면에서만 보이고 사라지면 안 됩니다" (사용자 요구)
- **구현**: 빈 상태에서 카드 구조, 레이블, 설명 텍스트만 표시

### 2. 네비게이션 구조 전환

- **결정**: Feature-centric에서 Insight-flow로 전면 전환
- **이유**: 사용자가 "기능"이 아닌 "워크플로우"를 따라가야 함
- **구현**: 8개 그룹으로 재구성, Start Hub가 진입점

### 3. 인사이트 페이지 3탭 구조

- **결정**: 인사이트/액션/에비던스를 한 페이지에서 탭으로 전환
- **이유**: Phase 7의 Insight → Action → Evidence 파이프라인을 UX에 직접 매핑
- **구현**: 탭 간 컨텍스트 유지, 카테고리 필터 공유

### 4. 한국어 우선 하드코딩

- **결정**: 페이지 본문은 한국어 직접 작성, 네비게이션만 i18n
- **이유**: Phase 8은 구조 검증 단계, 전체 i18n은 Phase 9
- **구현**: `next-intl` 키는 네비게이션에만 적용

---

## Phase 9에서 해야 할 일

### 필수 (Must)

1. **tRPC 라우트 생성**: insights, actions, evidence, intent, geo-aeo, faq, campaigns
2. **실 데이터 연결**: Phase 7 서비스 → tRPC → 프론트엔드 컴포넌트
3. **역할 기반 분기**: 사용자 역할에 따라 대시보드/리포트 섹션 필터링
4. **리포트 뷰어**: ReportCompositionService 출력을 렌더링하는 상세 페이지
5. **에비던스 시각화**: displayType별 차트 렌더링 (TABLE, PIE_CHART, LINE_CHART 등)

### 권장 (Should)

6. **PDF/PPT 내보내기**: Evidence Bundle → 다운로드 가능한 문서
7. **알림 시스템**: AlertTriggerPreparationService → 실시간 알림 UI
8. **페이지 본문 i18n**: 한국어 하드코딩 → next-intl 키 전환
9. **로딩/에러 상태**: Skeleton UI, 에러 바운더리, 재시도 로직

### 선택 (Nice to have)

10. **실시간 업데이트**: WebSocket으로 대시보드 자동 갱신
11. **온보딩 투어**: 첫 방문자 가이드
12. **역할 선택 UI**: 사용자가 자신의 역할 설정
