# Search Intelligence Integration Notes

> 이번 단계에서 실제 반영한 코드 · 남은 과제 · 다음 단계 준비 사항

## 1. 이번 단계에서 반영한 코드

### 1.1 서비스 레이어 (신규 생성: 7개 파일)

```
packages/api/src/services/search-intelligence/
├── index.ts                                    # Barrel export
├── types.ts                                    # SearchIntelligenceResult (재선언), Quality 타입, Role 설정
├── search-data-quality.ts                      # assessSearchDataQuality() — 품질 등급 판정
├── search-insight-integration.service.ts       # SearchInsightIntegrationService — Insight collector
├── search-action-integration.service.ts        # SearchActionIntegrationService — Action collector
├── search-evidence-bundle.service.ts           # SearchEvidenceBundleService — Evidence 빌더
├── search-report-section-builder.ts            # SearchReportSectionBuilder — Report 섹션 생성
└── search-executive-summary.service.ts         # SearchExecutiveSummaryService — 경영진 요약
```

### 1.2 서비스 팩토리 등록

`packages/api/src/services/index.ts`에 5개 서비스 인스턴스 등록:
- `searchInsightIntegration`
- `searchActionIntegration`
- `searchEvidenceBundle`
- `searchReportSectionBuilder`
- `searchExecutiveSummary`

모든 서비스가 stateless이므로 별도 repository/logger 주입 불필요.

### 1.3 데이터 흐름

```
SearchIntelligenceResult (from apps/web)
  │
  ├─ assessSearchDataQuality() → SearchDataQualityAssessment
  │   ├─ level: HIGH | MEDIUM | LOW | INSUFFICIENT
  │   ├─ isMockOnly: boolean (mock 소스만 사용했는지)
  │   ├─ usableForReport: boolean
  │   └─ usableForInsight: boolean
  │
  ├─ SearchInsightIntegrationService.collectInsights()
  │   → GeneratedInsight[] (InsightGenerationService에 합류)
  │
  ├─ SearchActionIntegrationService.collectActions()
  │   → RecommendedAction[] (ActionRecommendationOrchestrator에 합류)
  │
  ├─ SearchEvidenceBundleService.buildSearchEvidenceItems()
  │   → EvidenceBundleItem[] (EvidenceBundleService에 합류)
  │
  ├─ SearchReportSectionBuilder.buildSections()
  │   → SearchReportSection[] (ReportCompositionService에 합류)
  │
  └─ SearchExecutiveSummaryService.generateSearchExecutiveSummary()
      → SearchExecutiveSummary (ExecutiveSummaryService에 합류)
```

## 2. 설계 결정

### 2.1 Stateless 서비스

- 모든 integration 서비스는 stateless로 설계
- Repository 의존 없음 — SearchIntelligenceResult만 입력으로 받음
- 이유: search intelligence 데이터는 apps/web 측에서 이미 수집/저장되므로, packages/api 측에서는 변환만 담당

### 2.2 품질 게이트 (assessSearchDataQuality)

- InsightGenerationService 진입 전에 품질을 평가하여 게이트 역할
- INSUFFICIENT 등급은 모든 파이프라인 진입 차단
- Mock 전용 데이터는 Report 주 입력에서 제외 (경고 표시만)
- 이유: Mock 데이터 기반 인사이트가 실제 리포트에 포함되면 오해 유발

### 2.3 SearchIntelligenceResult 타입 재선언

- packages/api에서 apps/web/src/services/search-intelligence/types.ts를 직접 import하지 않음
- 대신 동일한 shape의 타입을 packages/api/src/services/search-intelligence/types.ts에 재선언
- 이유: packages/api → apps/web 방향의 import는 모노레포 아키텍처 위반

### 2.4 Role-based Output

- ROLE_OUTPUT_CONFIG를 통해 역할별 출력 범위를 제어
- EXECUTIVE는 전략적 요약만 (최대 4섹션, trace/raw data 제외)
- PRACTITIONER은 전체 + 기술 상세 + 품질 정보
- 이유: 역할에 따라 필요한 정보의 깊이가 다름

### 2.5 Confidence 조정

- 인사이트의 confidence = base × quality.confidence
- severity는 낮은 품질일 때 한 단계 하향
- 이유: 데이터 품질이 낮으면 인사이트 확신도도 낮아야 함

## 3. 남은 과제

### 3.1 단기 (다음 스프린트)

- [ ] **InsightGenerationService 직접 통합**: collectSearchIntelligenceInsights() 메서드를 InsightGenerationService에 추가하여 8번째 collector로 동작
- [ ] **ActionRecommendationOrchestrator 직접 통합**: collectSearchIntelligenceSignals() 메서드 추가
- [ ] **EvidenceBundleService SEARCH_INTELLIGENCE 타입 추가**: BundleType에 "SEARCH_INTELLIGENCE" 추가, createBundle에서 호출
- [ ] **ReportCompositionService 섹션 추가**: getSectionDefinitions에 검색 인텔리전스 섹션 추가
- [ ] **프론트엔드 연결**: API 호출 → 통합 서비스 → UI 표시

### 3.2 중기

- [ ] **SearchIntelligenceResult → packages/shared 타입 이동**: 모노레포 공유 패키지로 타입 통합
- [ ] **시계열 비교**: 동일 키워드의 시간대별 search intelligence 비교
- [ ] **배치 분석 통합**: 여러 키워드의 search intelligence를 묶어 프로젝트 수준 인사이트
- [ ] **LLM 내러티브 생성**: 기계적 내러티브 → AI 기반 자연어 요약

### 3.3 장기

- [ ] **실시간 대시보드**: search intelligence KPI를 대시보드에 표시
- [ ] **자동 리포트 스케줄**: 주기적으로 search intelligence → report 자동 생성
- [ ] **알림 자동화**: confidence 급락 / 새 클러스터 발견 시 알림

## 4. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| InsightGenerationService | 유지됨 — 기존 7개 collector 그대로 동작 |
| ActionRecommendationOrchestrator | 유지됨 — 기존 7개 signal 그대로 동작 |
| EvidenceBundleService | 유지됨 — 기존 8개 BundleType 그대로 동작 |
| ReportCompositionService | 유지됨 — 기존 9개 ReportType 그대로 동작 |
| ExecutiveSummaryService | 유지됨 — 기존 입력 구조 그대로 동작 |
| 새 서비스는 독립적 추가 | 기존 서비스와 별도 호출 가능 |

## 5. 테스트 시나리오

### 5.1 품질 게이트 테스트

```
Input: SearchIntelligenceResult (confidence: 0.1, all mock sources)
Expected: quality.level = "LOW", usableForReport = false
Expected: Insight에 [Mock 데이터] 접두, 낮은 severity
```

### 5.2 정상 흐름 테스트

```
Input: SearchIntelligenceResult (confidence: 0.8, fresh, 4 engines success)
Expected: quality.level = "HIGH"
Expected: Insight 5-8개 (cluster + pathfinder + roadview + persona + cross)
Expected: Action 4-6개
Expected: Evidence 8개 항목
Expected: Report 5개 섹션 (PRACTITIONER)
```

### 5.3 Role 분기 테스트

```
Input: 동일 SearchIntelligenceResult
EXECUTIVE: 1개 섹션, 3개 액션 최대, KPI + 전략적 시사점만
PRACTITIONER: 5개 섹션, 전체 액션, 기술 상세 + 품질 정보 포함
```
