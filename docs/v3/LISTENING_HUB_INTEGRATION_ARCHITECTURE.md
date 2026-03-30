# Listening Hub Integration Architecture

> 리스닝마인드형 검색 인텔리전스가 X2의 홈 대시보드 & 리스닝 허브에 통합되는 전체 아키텍처

## 1. 시스템 구조

```
사용자 입력 (시드 키워드)
  │
  ▼
[apps/web] Listening Hub Page (/listening-hub)
  │
  ├─ POST /api/search-intelligence/analyze
  │   └─ SearchConnectorRegistry → resolveSearchData
  │       └─ NormalizedSearchAnalyticsPayload
  │           │
  │           ├─ ClusterEngine (1st)
  │           ├─ PersonaEngine (parallel)
  │           ├─ PathfinderEngine (parallel)
  │           └─ RoadViewEngine (parallel)
  │
  ├─ SearchIntelligenceResult (전체 결과)
  │   │
  │   ├─ [apps/web] UI 렌더링
  │   │   ├─ 홈 대시보드 카드 (요약)
  │   │   └─ 리스닝 허브 섹션 (상세)
  │   │
  │   └─ [packages/api] 통합 서비스
  │       ├─ assessSearchDataQuality() → 품질 게이트
  │       ├─ SearchInsightIntegrationService → InsightGenerationService
  │       ├─ SearchActionIntegrationService → ActionRecommendationOrchestrator
  │       ├─ SearchEvidenceBundleService → EvidenceBundleService
  │       ├─ SearchReportSectionBuilder → ReportCompositionService
  │       └─ SearchExecutiveSummaryService → ExecutiveSummaryService
  │
  ▼
[기존 X2 파이프라인]
  ├─ Insight → Report → Evidence
  ├─ Action → Campaign 연결
  └─ 소셜/댓글 분석과 교차 분석
```

## 2. 데이터 흐름

### 2.1 홈 대시보드 (요약 경험)

```
SearchIntelligenceResult
  │
  ├─ TrendingIntentCard       ← intent 요약 (top 3)
  ├─ ClusterSummaryCard       ← cluster 요약 (top labels + keywords)
  ├─ PersonaSummaryCard       ← persona 요약 (top 3 archetypes)
  ├─ TopJourneyPreviewCard    ← pathfinder 요약 (top paths)
  ├─ ListeningSummaryCard     ← 전체 메트릭 요약
  ├─ ListeningActionCard      ← 추천 액션 (top 3)
  └─ SearchIntelligenceStatusBar ← 데이터 품질/신뢰도
```

### 2.2 리스닝 허브 (분석 경험)

```
SearchIntelligenceResult
  │
  ├─ IntentSummarySection     [section-overview]  개요/의도 분포
  ├─ ClusterSection           [section-cluster]   클러스터 상세
  ├─ PathfinderSection        [section-pathfinder] 검색 경로 네트워크
  ├─ RoadViewSection          [section-roadview]  사용자 여정 단계
  ├─ PersonaSection           [section-persona]   페르소나 프로필
  ├─ SearchInsightSection     [section-insight]   인사이트 목록
  ├─ SearchActionSection      [section-action]    추천 액션
  └─ SearchEvidenceSection    [section-evidence]  근거 자료
```

## 3. 컴포넌트 계층

```
apps/web/src/
├─ app/(dashboard)/
│   ├─ dashboard/
│   │   └─ dashboard-view.tsx          # 리스닝 카드 통합된 대시보드
│   └─ listening-hub/
│       └─ page.tsx                    # 리스닝 허브 메인 페이지
│
├─ components/
│   ├─ dashboard/                      # 대시보드용 요약 카드 (7개)
│   │   ├─ TrendingIntentCard.tsx
│   │   ├─ TopJourneyPreviewCard.tsx
│   │   ├─ PersonaSummaryCard.tsx
│   │   ├─ ClusterSummaryCard.tsx
│   │   ├─ ListeningActionCard.tsx
│   │   ├─ ListeningSummaryCard.tsx
│   │   └─ SearchIntelligenceStatusBar.tsx
│   │
│   └─ listening-hub/                  # 리스닝 허브용 섹션 (9개)
│       ├─ ListeningHubLayout.tsx
│       ├─ IntentSummarySection.tsx
│       ├─ ClusterSection.tsx
│       ├─ PathfinderSection.tsx
│       ├─ RoadViewSection.tsx
│       ├─ PersonaSection.tsx
│       ├─ SearchInsightSection.tsx
│       ├─ SearchActionSection.tsx
│       └─ SearchEvidenceSection.tsx
│
└─ lib/
    └─ constants.ts                    # /listening-hub 네비게이션 추가
```

## 4. 상태 UX 매트릭스

| 상태 | 대시보드 카드 | 리스닝 허브 섹션 |
|------|---------------|-----------------|
| 데이터 없음 | 빈 상태 + CTA | 키워드 입력 폼 표시 |
| 로딩 중 | 스켈레톤 | 스피너 + "분석 중..." |
| 성공 (HIGH) | 데이터 + 녹색 신뢰도 | 전체 섹션 + 신뢰도 바 |
| 성공 (LOW) | 데이터 + 주황 경고 | 데이터 + 경고 배너 |
| Mock 전용 | 데이터 + 빨간 "목업" 배지 | 데이터 + "목업 데이터" 경고 |
| 부분 데이터 | 데이터 + 주황 "부분" 배지 | 성공 섹션만 + 실패 섹션 에러 |
| Stale | 데이터 + "갱신 필요" 배지 | 데이터 + "데이터 오래됨" 배너 |
| 실패 | 에러 메시지 | 에러 배너 + 재시도 안내 |

## 5. 교차 연결 (Cross-Section CTA)

```
클러스터 → "페르소나에서 이 클러스터의 검색자 유형 확인하기"
패스파인더 → "추천 액션에서 이 경로 기반 콘텐츠 전략 보기"
로드뷰 → "근거 자료에서 단계별 데이터 확인하기"
페르소나 → "사용자 여정에서 이 페르소나의 경로 보기"
액션 → "이 액션을 포함한 리포트 생성하기"
근거 → "이 근거로 리포트 생성하기"
```

## 6. 기존 X2 연결 포인트

| X2 기능 | 연결 방식 |
|---------|----------|
| 소셜/댓글 분석 | 대시보드에서 "소셜 & 댓글 분석" 섹션으로 분리 표시 |
| 리포트 | 액션/근거 섹션에서 "리포트 생성" CTA |
| 캠페인 | 액션에서 직접 캠페인 연결 (향후) |
| 키워드 추적 | 클러스터/의도 카드에서 키워드 페이지 연결 |
| GEO/AEO | 대시보드 차트 영역에서 기존 위치 유지 |
| 인사이트 | 리스닝 허브 인사이트 → 통합 인사이트 페이지 연결 |

## 7. Role-based 구조

| 역할 | 대시보드 강조 | 리스닝 허브 강조 |
|------|-------------|----------------|
| PRACTITIONER | 전체 카드 + 기술 상세 | 전체 섹션 + 품질 정보 |
| MARKETER | 의도/클러스터/액션 강조 | 액션/인사이트 우선 |
| ADMIN | 상태바 + 엔진 성공률 | 품질/경고 섹션 강조 |
| EXECUTIVE | 요약 카드 + 전략 액션 | 개요 + 전략적 시사점만 |

> 현재 구현은 기본(PRACTITIONER) 뷰. Role-based 분기는 다음 단계에서 `RoleContext`를 prop으로 전달하여 구현.
